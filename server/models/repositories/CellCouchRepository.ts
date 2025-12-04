import { configDotenv } from "dotenv";
import { Cell } from "../Cell.js";
import { CellDocument } from "../utils/couchTypes.js";
import { BasicCouchRepository } from "./BasicCouchRepository.js";
import { CellRepository } from "./interfaces/CellRepository.js";
import { CouchManager } from "../BaseManager/CouchManager.js";

configDotenv();

export class CellCouchRepository
  extends BasicCouchRepository<CellDocument>
  implements CellRepository
{
  update(
    id: string,
    item: Partial<CellDocument>
  ): Promise<CellDocument | null> {
    id;
    item;
    throw new Error("Method not implemented.");
  }
  static designDocId: string = "cell_views";
  static SIZE: number = process.env.SIZE ? parseInt(process.env.SIZE) : 40;

  static async findOne(x: number, y: number): Promise<CellDocument | null> {
    try {
      const response = await CouchManager.findView(
        CellCouchRepository.designDocId,
        "by_cells",
        { include_docs: "true" },
        [[x, y]]
      );

      if (response.total_rows === 0) {
        console.log(
          `[${CellCouchRepository.findOne.name}] No cell found at coordinates (${x}, ${y}).`
        );
        return null;
      }

      return response.rows[0].doc as CellDocument;
    } catch (error) {
      console.error(
        `[${CellCouchRepository.findOne.name}] Error finding cell:`,
        error
      );
      return null;
    }
  }

  async count(): Promise<number> {
    try {
      const cells = await CouchManager.findView(
        CellCouchRepository.designDocId,
        "by_cells"
      );
      if (cells && cells.total_rows !== undefined) {
        return cells.total_rows;
      }
      return 0;
    } catch (error) {
      console.error(`[${this.count.name}] Error counting cells:`, error);
      return 0;
    }
  }

  async findAll(): Promise<CellDocument[]> {
    try {
      const queryResult = await CouchManager.findView(
        CellCouchRepository.designDocId,
        "by_cells",
        { include_docs: "true" }
      );
      const agents: CellDocument[] = queryResult.rows
        .map((row) => row.doc)
        .filter((doc): doc is CellDocument => doc !== undefined);
      return agents;
    } catch (error) {
      console.error("Error fetching all agents:", error);
      return [];
    }
  }

  async updateCell(
    x: number,
    y: number,
    increment: number,
    agent: string
  ): Promise<Cell | null> {
    try {
      increment;
      const data = await CouchManager.callUpdateHandler(
        "cell_updates",
        "reserve_cell",
        `${x}-${y}`,
        {},
        { agent: agent }
      ).catch((error) => {
        console.error(`[${this.updateCell.name}] Error calling update handler`);
        throw error;
      });
      if (data && "doc" in data) return data.doc as CellDocument;
      else {
        console.log(`[${this.updateCell.name}] No doc returned`);
        throw new Error("No doc returned from update handler");
      }
    } catch (error) {
      console.error(
        `[${this.updateCell.name}] Error incrementing cell value:`,
        error
      );
      throw error;
    }
  }

  async getRandomUndiscoveredCell(): Promise<Cell | null> {
    try {
      const undiscoveredCells = await CouchManager.findView(
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
      const neighbors = await CouchManager.findView(
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
