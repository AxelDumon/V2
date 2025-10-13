import { BasicMongoRepository } from "./BasicMongoRepository.js";
import { Cell } from "../Cell.js";
import { CellRepository } from "./interfaces/CellRepository.js";
import { Filter } from "mongodb";

export class CellMongoRepository
  extends BasicMongoRepository<Cell>
  implements CellRepository
{
  static SIZE: number = Number(process.env.SIZE) || 40;

  async updateCell(
    x: number,
    y: number,
    increment: number,
    agent: string
  ): Promise<Cell | null> {
    return (
      await this.collection.findOneAndUpdate(
        { x: x, y: y, valeur: 0 } as Filter<Cell>,
        { $inc: { valeur: increment }, $addToSet: { agents: agent } },
        { returnDocument: "after", includeResultMetadata: true, upsert: true }
      )
    ).value as Cell;
  }

  async getRandomUndiscoveredCell(): Promise<Cell | null> {
    return (await this.collection
      .aggregate([{ $match: { valeur: 0 } }, { $sample: { size: 1 } }])
      .next()) as Cell;
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
        { x: neighbor.x, y: neighbor.y } as Filter<Cell>,
        {
          $setOnInsert: { x: neighbor.x, y: neighbor.y, valeur: 0, agents: [] },
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
            $or: validNeighbors.map((n) => ({ x: n.x, y: n.y })),
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
