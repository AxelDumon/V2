import { configDotenv } from "dotenv";
import { Cell } from "../Cell";
import { CellDocument } from "../utils/couchTypes";
import { BasicCouchRepository } from "./BasicCouchRepository";
import { CellRepository } from "./interfaces/CellRepository";

configDotenv();

export class CellCouchRepository
  extends BasicCouchRepository<CellDocument>
  implements CellRepository
{
  static designDocId: string = "cell_views";
  static SIZE: number = process.env.SIZE ? parseInt(process.env.SIZE) : 40;
  updateCell(
    x: number,
    y: number,
    increment: number,
    agent: string
  ): Promise<Cell | null> {
    throw new Error("Method not implemented.");
  }

  async getRandomUndiscoveredCell(): Promise<Cell | null> {
    try {
      const undiscoveredCells = await CouchDB.findView(
        CellCouchRepository.designDocId,
        "by_undiscovered_cells",
        { include_docs: "true" }
      );

      if (undiscoveredCells.total_rows === 0) {
        console.log(
          `[${this.getRandomUndiscoveredCell.name}] No undiscovered cells found.`
        );
        return null;
      }

      const randomIndex = Math.floor(
        Math.random() * undiscoveredCells.total_rows
      );
      const cellData: CellDocument = undiscoveredCells.rows[randomIndex]
        .doc as CellDocument;

      return cellData;
    } catch (error) {
      console.error(
        `[${this.getRandomUndiscoveredCell.name}] Error fetching undiscovered cell:`,
        error
      );
      return null;
    }
  }
  async getUndiscoveredNeighbors(x: number, y: number): Promise<Cell[]> {
    try {
      const startkey = [Math.max(0, x - 1), Math.max(0, y - 1)];
      const endkey = [
        Math.min(CellCouchRepository.SIZE - 1, x + 1),
        Math.min(CellCouchRepository.SIZE - 1, y + 1),
      ];
      const neighbors = await CouchDB.findView(
        CellCouchRepository.designDocId,
        "undiscovered_neighbors",
        {
          startkey: JSON.stringify(startkey),
          endkey: JSON.stringify(endkey),
        }
      );

      const filteredNeighbors = neighbors.rows
        .map((row) => row.value)
        .filter((cell) => {
          const dx = Math.abs(cell.x - x);
          const dy = Math.abs(cell.y - y);
          return (
            (dx === 1 && dy === 0) ||
            (dx === 0 && dy === 1) ||
            (dx === 1 && dy === 1)
          );
        });

      return filteredNeighbors;
    } catch (error) {
      console.error(
        `[${this.getUndiscoveredNeighbors.name}] Error fetching undiscovered neighbors:`,
        error
      );
      return [];
    }
  }
  initGrid(): Promise<number> {
    throw new Error("Method not implemented.");
  }
}
