import { BasicMongoRepository } from './BasicMongoRepository';
import { Cell } from '../Cell';
import { CellRepository } from './interfaces/CellRepository';

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
				{ returnDocument: 'after', includeResultMetadata: true }
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
		for (let x = 0; x < 100; x++) {
			for (let y = 0; y < 100; y++) {
				cells.push({ x: x, y: y, valeur: 0, agents: [] });
			}
		}
		await this.collection.insertMany(cells);
		return cells.length;
	}
}
