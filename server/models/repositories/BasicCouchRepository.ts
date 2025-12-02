import { Agent } from "../Agent";
import { CouchManager } from "../BaseManager/CouchManager";
import { Cell } from "../Cell";
import { AgentDocument } from "../utils/couchTypes";
import { CellDocument } from "../utils/types";
import { BaseRepository } from "./interfaces/BaseRepository";

export abstract class BasicCouchRepository<
  T extends CellDocument | AgentDocument
> implements BaseRepository<T>
{
  static designDocId: string;
  deleteAll(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  count(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  findAll(): Promise<T[]> {
    throw new Error("Method not implemented.");
  }
  create(item: T): Promise<T> {
    throw new Error("Method not implemented.");
  }
  update(id: string, item: Partial<T>): Promise<T | null> {
    throw new Error("Method not implemented.");
  }
  deleteById(id: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  static async bulkDocs(
    bulkDelete: { _id: string; _rev: string | undefined; _deleted: boolean }[]
  ) {
    return fetch(`${CouchManager.dbUrl}/_bulk_docs`, {
      method: "POST",
      headers: {
        Authorization: CouchManager.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ docs: bulkDelete }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to bulk delete documents: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error("Error during bulk delete:", error);
        throw error;
      });
  }
}
