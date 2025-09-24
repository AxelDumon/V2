// import { CouchDB } from '../utils/CouchDB';

import { CouchDB } from '../utils/CouchDB.js';

export type Cell = {
	x: number;
	y: number;
	valeur: number;
	agents: string[];
};

// let cellsCollection: Collection<Cell> | undefined;

// export function setCellsCollection(collection: Collection<Cell>) {
// 	cellsCollection = collection;
// }

// export function getCellsCollection(): Collection<Cell> {
// 	if (!cellsCollection) throw new Error('cellsCollection not initialized');
// 	return cellsCollection;
// }

// const url: String = `http://127.0.0.1:5984/${process.env.DB_NAME || 'v2grid'}`;
const SIZE: number = Number(process.env.SIZE);

export async function countCells() {
	try {
		const count = await fetch(`${CouchDB.dbUrl}`, {
			headers: { Authorization: CouchDB.authHeader },
		}).then(res => res.json());
		return count;
	} catch (error) {
		console.error('Error counting cells:', error);
		return 0;
	}
}

export async function initGrid() {
	const bulk: Cell[] = [];
	for (let i = 0; i < SIZE; i++) {
		for (let j = 0; j < SIZE; j++) {
			bulk.push({ x: i, y: j, valeur: 0, agents: [] });
		}
	}
	const res = await fetch(`${CouchDB.dbUrl}/_bulk_docs`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: CouchDB.authHeader,
		},
		body: JSON.stringify({ docs: bulk }),
	});
	console.log(`Grille initialisée (${bulk.length} cases)`);
	return res;
}
