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
  static designDocId: string = "cell_views";
  static SIZE: number = process.env.SIZE ? parseInt(process.env.SIZE) : 40;
  static BOOL_GRID: boolean[] = Array(
    CellCouchRepository.SIZE * CellCouchRepository.SIZE
  ).fill(false);
  update(
    id: string,
    item: Partial<CellDocument>
  ): Promise<CellDocument | null> {
    id;
    item;
    throw new Error("Method not implemented.");
  }

  static async findOne(x: number, y: number): Promise<CellDocument | null> {
    try {
      const response = await CouchManager.findView(
        CellCouchRepository.designDocId,
        "by_cells",
        { include_docs: "true" },
        [`${x}-${y}`]
      );

      if (response.total_rows === 0) {
        return null;
      }

      if (response.rows.length === 0 || !response.rows[0].value) {
        return null;
      }

      // console.log(response.rows[0].value);

      return response.rows[0].value as CellDocument;
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
      // Get all discovered cells (valeur > 0)
      const foundCells: { x: number; y: number }[] = (
        await CouchManager.findView(
          CellCouchRepository.designDocId,
          "by_discovered_cells"
        )
      ).rows
        .map((row) => row.id.split("-"))
        .map(([x, y]) => ({
          x: parseInt(x),
          y: parseInt(y),
        }));
      console.log(
        `[${this.getRandomUndiscoveredCell.name}] Found ${foundCells.length} discovered cells.`
      );

      // If all cells are discovered, return null
      if (
        foundCells.length >=
        CellCouchRepository.SIZE * CellCouchRepository.SIZE
      ) {
        console.log(
          `[${this.getRandomUndiscoveredCell.name}] All cells are discovered. Returning null.`
        );
        return null;
      }

      const boolGrid = CellCouchRepository.BOOL_GRID.slice();
      // Update BOOL_GRID based on found cells
      foundCells.forEach((cell) => {
        boolGrid[cell.x * CellCouchRepository.SIZE + cell.y] = true;
      });

      // const unexploredCells: { x: number; y: number }[] = [];
      const chosenIndex = boolGrid.indexOf(false);
      const x = Math.floor(chosenIndex / CellCouchRepository.SIZE);
      const y = chosenIndex % CellCouchRepository.SIZE;
      const chosenCell = new Cell(x, y, 0, [], `${x}-${y}`);
      console.log(
        `[${this.getRandomUndiscoveredCell.name}] Chosen cell: x:${chosenCell.x}, y:${chosenCell.y}`
      );

      return chosenCell;
    } catch (error) {
      console.error(
        `[${this.getRandomUndiscoveredCell.name}] Error fetching undiscovered cell:`,
        error
      );
      throw error;
    }
  }

  async getUndiscoveredNeighbors(x: number, y: number): Promise<Cell[]> {
    try {
      const startkey = [Math.max(0, x - 1), Math.max(0, y - 1)];
      const endkey = [
        Math.min(CellCouchRepository.SIZE - 1, x + 1),
        Math.min(CellCouchRepository.SIZE - 1, y + 1),
      ];

      const undiscoveredCells = [];

      for (let i = startkey[0]; i <= endkey[0]; i++) {
        for (let j = startkey[1]; j <= endkey[1]; j++) {
          if (i === x && j === y) {
            continue; // Skip the center cell
          }
          const cell = await CellCouchRepository.findOne(i, j);
          if (cell && cell.valeur > 0) continue; // Skip discovered cells{
          if (cell) {
            undiscoveredCells.push(cell);
          } else {
            undiscoveredCells.push({
              x: i,
              y: j,
              valeur: 0,
              agents: [],
              _id: `${i}-${j}`,
              type: "cell",
            });
          }
        }
      }

      // const resp = await CouchManager.findView(
      //   CellCouchRepository.designDocId,
      //   "by_cells",
      //   {
      //     include_docs: "true",
      //     startkey: JSON.stringify(startkey),
      //     endkey: JSON.stringify(endkey),
      //   }
      // );

      // const neighbors = await CouchManager.findView(
      //   CellCouchRepository.designDocId,
      //   "undiscovered_neighbors",
      //   {
      //     startkey: JSON.stringify(startkey),
      //     endkey: JSON.stringify(endkey),
      //   }
      // );

      // const filteredNeighbors = neighbors.rows
      //   .map((row) => row.value)
      //   .filter((cell) => {
      //     const dx = Math.abs(cell.x - x);
      //     const dy = Math.abs(cell.y - y);
      //     return (
      //       (dx === 1 && dy === 0) ||
      //       (dx === 0 && dy === 1) ||
      //       (dx === 1 && dy === 1)
      //     );
      //   });

      return undiscoveredCells as Cell[];
    } catch (error) {
      console.error(
        `[${this.getUndiscoveredNeighbors.name}] Error fetching undiscovered neighbors:`,
        error
      );
      return [];
    }
  }
  async initGrid(): Promise<number> {
    this.deleteAll().catch((error) => {
      console.error(
        `[${this.initGrid.name}] Error deleting existing cells:`,
        error
      );
    });
    return 0;
  }
}
