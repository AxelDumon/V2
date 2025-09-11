export type Cell = {
	x: number;
	y: number;
	valeur: number;
	agents: string[];
};

import { Collection } from 'mongodb';

let cellsCollection: Collection<Cell> | undefined;

export function setCellsCollection(collection: Collection<Cell>) {
	cellsCollection = collection;
}

export function getCellsCollection(): Collection<Cell> {
	if (!cellsCollection) throw new Error('cellsCollection not initialized');
	return cellsCollection;
}
