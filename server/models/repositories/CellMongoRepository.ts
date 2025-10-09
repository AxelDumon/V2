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

	getRandomUndiscoveredCell(): Promise<Cell | null> {
		throw new Error('Method not implemented.');
	}
	getUndiscoveredNeighbors(x: number, y: number): Promise<Cell[]> {
		throw new Error('Method not implemented.');
	}
	initGrid(): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
