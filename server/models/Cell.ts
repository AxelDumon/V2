export type Cell = {
	x: number;
	y: number;
	valeur: number;
	agents: string[];
};

import { Collection } from 'mongodb';

let cellsCollection: Collection | undefined;

export function setCellsCollection(collection: Collection) {
	cellsCollection = collection;
}

export function getCellsCollection(): Collection {
	if (!cellsCollection) throw new Error('cellsCollection not initialized');
	return cellsCollection;
}
