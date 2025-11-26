import { Collection, Document, Filter } from "mongodb";
import { Agent } from "../Agent.js";
import { Cell } from "../Cell.js";
import { BaseRepository } from "./interfaces/BaseRepository.js";

export abstract class BasicMongoRepository<T extends (Cell | Agent) & Document>
  implements BaseRepository<T>
{
  public collectionGetter: () => Collection<T>;

  constructor(collectionGetter: () => Collection<T>) {
    this.collectionGetter = collectionGetter;
  }

  async deleteAll(): Promise<void> {
    try {
      // For debugging purposes, log the count before deletion
      const countBefore = await this.collectionGetter().countDocuments();
      const result = (await this.collectionGetter().deleteMany({}))
        .deletedCount;
      console.log(`[${this.deleteAll.name}] ${result} documents deleted.`);
      console.log(
        `[${this.deleteAll.name}] Deleting all documents. Count before: ${countBefore}`
      );
    } catch (error) {
      console.error(
        `[${this.deleteAll.name}] Error fetching count before deletion:`,
        error
      );
    }
  }

  async count(): Promise<number> {
    try {
      return await this.collectionGetter().countDocuments();
    } catch (error) {
      console.error(`[${this.count.name}] Error counting documents:`, error);
      throw error;
    }
  }

  async findAll(): Promise<T[]> {
    try {
      return (await this.collectionGetter().find().toArray()) as T[];
    } catch (error) {
      console.error(
        `[${this.findAll.name}] Error finding all documents:`,
        error
      );
      throw error;
    }
  }

  async create(item: T): Promise<T> {
    try {
      const result = await this.collectionGetter().insertOne(item as any);
      return { ...item, _id: result.insertedId.toString() } as T;
    } catch (error) {
      console.error(`[${this.create.name}] Error creating document:`, error);
      throw error;
    }
  }

  async update(id: string, item: Partial<T>): Promise<T | null> {
    try {
      const result = await this.collectionGetter().findOneAndUpdate(
        { _id: id } as Filter<T>,
        { $set: item },
        { returnDocument: "after", upsert: true }
      );
      if (!result || !("value" in result)) return null;
      return result.value as T | null;
    } catch (error) {
      console.error(`[${this.update.name}] Error updating document:`, error);
      throw error;
    }
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      const result = await this.collectionGetter().deleteOne({
        _id: id,
      } as any);
      return result.deletedCount === 1;
    } catch (error) {
      console.error(
        `[${this.deleteById.name}] Error deleting document:`,
        error
      );
      throw error;
    }
  }
}
