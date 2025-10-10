import { BasicMongoRepository } from "./BasicMongoRepository";
import { Cell } from "../Cell";
import { CellRepository } from "./interfaces/CellRepository";
import { parameters } from "../../app";

export class CellMongoRepository
  extends BasicMongoRepository<Cell>
  implements CellRepository
{
  async updateCell(
    x: number,
    y: number,
    increment: number,
    agent: string
  ): Promise<Cell | null> {
    return (
      await this.collection.findOneAndUpdate(
        { x: x, y: y, valeur: 0 } as any,
        { $inc: { valeur: increment }, $addToSet: { agents: agent } },
        { returnDocument: "after", includeResultMetadata: true }
      )
    ).value as Cell;
  }

  async getRandomUndiscoveredCell(): Promise<Cell | null> {
    return (await this.collection
      .aggregate([{ $match: { valeur: 0 } }, { $sample: { size: 1 } }])
      .next()) as Cell;
  }

  async getUndiscoveredNeighbors(x: number, y: number): Promise<Cell[]> {
    return (await this.collection
      .aggregate([
        {
          $match: {
            valeur: 0,
            $or: [
              { x: x - 1, y: y },
              { x: x + 1, y: y },
              { x: x, y: y - 1 },
              { x: x, y: y + 1 },
            ],
          },
        },
      ])
      .toArray()) as Cell[];
  }

  async initGrid(): Promise<number> {
    this.deleteAll();
    const cells: Cell[] = [];
    for (let x = 0; x < parameters.SIZE; x++) {
      for (let y = 0; y < parameters.SIZE; y++) {
        cells.push(new Cell(x, y, 0, [], undefined));
      }
    }
    await this.collection.insertMany(cells);
    return cells.length;
  }
}
