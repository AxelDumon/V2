import { BaseRepository } from "./BaseRepository.js";
import { Cell } from "../../Cell.js";

export interface CellRepository extends BaseRepository<Cell> {
  updateCell(
    x: number,
    y: number,
    increment: number,
    agent: string
  ): Promise<Cell | null>;
  getRandomUndiscoveredCell(): Promise<Cell | null>;
  getUndiscoveredNeighbors(x: number, y: number): Promise<Cell[]>;
  initGrid(): Promise<number>;
}
