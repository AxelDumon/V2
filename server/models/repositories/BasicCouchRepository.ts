import { CouchManager } from "../BaseManager/CouchManager.js";
import { AgentDocument, CellDocument } from "../utils/couchTypes";
import { BaseRepository } from "./interfaces/BaseRepository.js";

export abstract class BasicCouchRepository<
  T extends CellDocument | AgentDocument
> implements BaseRepository<T>
{
  protected baseManager: CouchManager;
  static designDocId: string;

  constructor(baseManager: CouchManager) {
    this.baseManager = baseManager;
  }
  async deleteAll(): Promise<void> {
    const docs = await fetch(`${CouchManager.dbUrl}/_all_docs`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: CouchManager.authHeader,
      },
    });
    const data = await docs.json();
    console.log(data);
    if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
      console.log(`[${this.deleteAll.name}] No documents found to delete.`);
      return;
    }
    const deleteDocs = data.rows
      .filter(
        (row: any) =>
          row &&
          typeof row.id === "string" &&
          row.id.charAt(0) !== "_" &&
          row.value &&
          row.value.rev
      )
      .map((row: { id: string; value: { rev: string } & any }) => ({
        _id: row.id,
        _rev: row.value.rev,
        _deleted: true,
      }));

    if (deleteDocs.length === 0) {
      console.log(
        `[${this.deleteAll.name}] Nothing to delete (no deletable docs or missing revs).`
      );
      return;
    }

    const resp = await fetch(`${CouchManager.dbUrl}/_bulk_docs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: CouchManager.authHeader,
      },
      body: JSON.stringify({ docs: deleteDocs }),
    });
    const result = await resp.json();
    console.log(`[${this.deleteAll.name}] _bulk_docs response:`, result);

    if (
      !resp.ok ||
      (Array.isArray(result) && result.some((res) => res && res.error))
    ) {
      console.error(`[${this.deleteAll.name}] Some deletions failed`, result);
      throw new Error("deleteAll failed: see logs for details");
    }

    console.log(`[${this.deleteAll.name}] All documents deleted successfully.`);
  }
  abstract count(): Promise<number>;
  abstract findAll(): Promise<T[]>;
  async create(item: T): Promise<T> {
    let body;
    if (item.type === "cell") body = item as CellDocument;
    else body = item as AgentDocument;
    const createdDoc = await fetch(`${CouchManager.dbUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: CouchManager.authHeader,
      },
      body: JSON.stringify(body),
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
