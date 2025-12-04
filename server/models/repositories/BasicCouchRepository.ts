import { Agent } from "../Agent.js";
import { CouchManager } from "../BaseManager/CouchManager.js";
import { Cell } from "../Cell.js";
import { Document } from "../utils/couchTypes";
import { BaseRepository } from "./interfaces/BaseRepository.js";

export abstract class BasicCouchRepository<T extends (Cell | Agent) & Document>
  implements BaseRepository<T>
{
  protected baseManager: CouchManager;
  static designDocId: string;

  constructor(baseManager: CouchManager) {
    this.baseManager = baseManager;
  }
  async deleteAll(): Promise<void> {
    const docs = await fetch(
      `${CouchManager.dbUrl}/_all_docs?include_docs=true`
    );
    const data = await docs.json();
    if (data == undefined || data.rows === undefined) {
      console.log(`[${this.deleteAll.name}] No documents found to delete.`);
      return;
    }
    const deleteDocs = data.rows.map((row: any) => {
      return {
        _id: row.id,
        _rev: row.value.rev,
        _deleted: true,
      };
    });

    if (deleteDocs.length > 0) {
      await fetch(`${CouchManager.dbUrl}/_bulk_docs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ docs: deleteDocs }),
      });
    }
  }
  abstract count(): Promise<number>;
  abstract findAll(): Promise<T[]>;
  async create(item: T): Promise<T> {
    const createdDoc = await fetch(`${CouchManager.dbUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: CouchManager.authHeader,
      },
      body: JSON.stringify(item),
    });
    const data = (await createdDoc.json()) as {
      id: string;
      ok: boolean;
      rev: string;
    };
    item._id = data.id;
    item._rev = data.rev;
    return item;
  }
  abstract update(id: string, item: Partial<T>): Promise<T | null>;
  deleteById(id: string): Promise<boolean> {
    id;
    throw new Error("Method not implemented.");
  }
}
