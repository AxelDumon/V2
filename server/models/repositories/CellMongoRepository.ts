import { BasicMongoRepository } from "./BasicMongoRepository.js";
import { Cell } from "../Cell.js";
import { CellRepository } from "./interfaces/CellRepository.js";
import { Filter } from "mongodb";
import { CellDocument } from "../utils/types.js";

import dotenv from "dotenv";
dotenv.config();

export class CellMongoRepository
  extends BasicMongoRepository<Cell>
  implements CellRepository
{
  static SIZE: number = Number(process.env.SIZE) || 40;
  static BOOL_GRID: boolean[] = Array(
    CellMongoRepository.SIZE * CellMongoRepository.SIZE
  ).fill(false);

  async updateCell(
    x: number,
    y: number,
    increment: number,
    agent: string
  ): Promise<Cell | null> {
    return (
      await this.collection.findOneAndUpdate(
        { _id: `${x}-${y}` } as Filter<Cell>,
        {
          $inc: { valeur: increment },
          $addToSet: { agents: agent },
          $set: { x: x, y: y },
        },
        { returnDocument: "after", includeResultMetadata: true, upsert: true }
      )
    ).value as Cell;
  }

  async getRandomUndiscoveredCell(): Promise<Cell | null> {
    const foundCells: CellDocument[] = (await this.collection
      .aggregate([{ $match: { valeur: { $gt: 0 } } }])
      .toArray()) as CellDocument[];
    console.log(
      `[getRandomUndiscoveredCell] Found ${foundCells.length} discovered cells.`
    );

    // If all cells are discovered, return null
    if (
      foundCells.length >=
      CellMongoRepository.SIZE * CellMongoRepository.SIZE
    ) {
      console.log(
        "[getRandomUndiscoveredCell] All cells are discovered. Returning null."
      );
      return null;
    }

    const boolGrid = CellMongoRepository.BOOL_GRID.slice();
    // Update BOOL_GRID based on found cells
    foundCells.forEach((cell) => {
      boolGrid[cell.x * CellMongoRepository.SIZE + cell.y] = true;
    });

    const unexploredCells: { x: number; y: number }[] = [];
    boolGrid.forEach((cell, index) => {
      if (!cell) {
        const x = Math.floor(index / CellMongoRepository.SIZE);
        const y = index % CellMongoRepository.SIZE;
        unexploredCells.push({ x, y });
      }
    });

    const chosenCell =
      unexploredCells[Math.floor(Math.random() * unexploredCells.length)];

    console.log(
      `[getRandomUndiscoveredCell] Chosen cell: x:${chosenCell.x}, y:${chosenCell.y}`
    );

    return new Cell(
      chosenCell.x,
      chosenCell.y,
      0,
      [],
      `${chosenCell.x}-${chosenCell.y}`
    );
  }

  async getUndiscoveredNeighbors(x: number, y: number): Promise<Cell[]> {
    // Define potential neighbor coordinates
    const neighbors = [
      { x: x - 1, y: y },
      { x: x + 1, y: y },
      { x: x, y: y - 1 },
      { x: x, y: y + 1 },
      { x: x - 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y - 1 },
      { x: x + 1, y: y + 1 },
    ];

    // Filter out neighbors that are out of bounds
    const validNeighbors = neighbors.filter(
      (n) =>
        n.x >= 0 &&
        n.x < CellMongoRepository.SIZE &&
        n.y >= 0 &&
        n.y < CellMongoRepository.SIZE
    );

    // Upsert neighbors to ensure they exist
    for (const neighbor of validNeighbors) {
      await this.collection.updateOne(
        { _id: `${neighbor.x}-${neighbor.y}` } as Filter<Cell>,
        {
          $setOnInsert: {
            _id: `${neighbor.x}-${neighbor.y}`,
            x: neighbor.x,
            y: neighbor.y,
            valeur: 0,
            agents: [],
          },
        },
        { upsert: true }
      );
    }

    // Fetch neighbors that are still undiscovered (valeur: 0)
    return (await this.collection
      .aggregate([
        {
          $match: {
            valeur: 0,
            $or: validNeighbors.map((n) => ({ _id: `${n.x}-${n.y}` })),
          },
        },
      ])
      .toArray()) as Cell[];
  }

  async initGrid(): Promise<number> {
    this.deleteAll();
    // const cells: Cell[] = [];
    // for (let x = 0; x < size; x++) {
    //   for (let y = 0; y < size; y++) {
    //     cells.push(new Cell(x, y, 0, [], undefined));
    //   }
    // }
    // const result = await this.collection.insertMany(cells);
    // console.log(`Inserted ${result.insertedCount} cells into the grid`);
    return 0;
  }
}
