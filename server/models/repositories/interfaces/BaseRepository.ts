import { Agent } from '../../Agent';
import { Cell } from '../../Cell';

export interface BaseRepository<T extends Cell | Agent> {
	deleteAll(): Promise<void>;
	count(): Promise<number>;
	findAll(): Promise<T[]>;
	create(item: T): Promise<T>;
	update(id: string, item: Partial<T>): Promise<T | null>;
	deleteById(id: string): Promise<boolean>;
}
