import { Collection } from 'mongodb';
import { Agent } from '../Agent';
import { Cell } from '../Cell';
import { BaseRepository } from './interfaces/BaseRepository';

export abstract class BasicMongoRepository<T extends Cell | Agent>
	implements BaseRepository<T>
{
	protected collection: Collection<T>;

	constructor(collection: Collection<T>) {
		this.collection = collection;
	}

	async deleteAll(): Promise<void> {
		await this.collection.deleteMany({});
	}

	async count(): Promise<number> {
		return await this.collection.countDocuments();
	}

	async findAll(): Promise<T[]> {
		return (await this.collection.find().toArray()) as T[];
	}

	async create(item: T): Promise<T> {
		const result = await this.collection.insertOne(item as any);
		return { ...item, _id: result.insertedId.toString() } as T;
	}

	async update(id: string, item: Partial<T>): Promise<T | null> {
		const result = await this.collection.findOneAndUpdate(
			{ _id: id } as any,
			{ $set: item },
			{ returnDocument: 'after' }
		);
		if (!result || !('value' in result)) return null;
		return result.value as T;
	}

	async deleteById(id: string): Promise<boolean> {
		const result = await this.collection.deleteOne({ _id: id } as any);
		return result.deletedCount === 1;
	}
}
