import express from 'express';
import type { Request, Response } from 'express';

import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid';
import { getCellsCollection } from '../models/Cell.ts';

const router = express.Router();
const DELAY = process.env.DELAY ? Number(process.env.DELAY) : 100;
const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;
// let isExploring = false;

// function randInt(max: number): number {
// 	return Math.floor(Math.random() * max);
// }

function shuffle<T>(arr: T[]): T[] {
	return arr.sort(() => Math.random() - 0.5);
}

router.post('/', async (_req: Request, res: Response) => {
	// if (isExploring) return res.json({ status: 'already exploring' });
	// isExploring = true;
	const agentId = uuidv4();
	console.log(`Agent ${agentId} started exploring.`);
	res.json({ status: 'started' });

	(async () => {
		const startTime = Date.now();
		// await Cell.deleteMany({});

		let cell = await getCellsCollection()
			.aggregate([{ $match: { valeur: 0 } }, { $sample: { size: 1 } }])
			.toArray();
		if (cell.length === 0) return;

		let x = cell[0].x;
		let y = cell[0].y;

		while (true) {
			let foundFrontier = false;

			for (const [dx, dy] of shuffle([
				[0, 1],
				[0, -1],
				[1, 0],
				[-1, 0],
				[1, 1],
				[1, -1],
				[-1, 1],
				[-1, -1],
			])) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
					const reserved = await getCellsCollection().findOneAndUpdate(
						{ x: nx, y: ny, valeur: 0 },
						{ $inc: { valeur: 1 }, $addToSet: { agents: agentId } },
						{ returnDocument: 'after' }
					);
					if (reserved) {
						x = nx;
						y = ny;
						foundFrontier = true;
						console.log(
							`Agent ${agentId} explores frontier cell (${x}, ${y}), value: ${reserved.valeur}`
						);
						await new Promise(resolve => setTimeout(resolve, DELAY));
						break;
					}
				}
			}

			if (!foundFrontier) {
				console.log(
					`Agent ${agentId}: No adjacent frontier found, teleporting...`
				);
				const undiscovered = await getCellsCollection()
					.aggregate([{ $match: { valeur: 0 } }, { $sample: { size: 1 } }])
					.toArray();
				if (undiscovered.length === 0) break;

				const teleport = undiscovered[0];
				const reserved = await getCellsCollection().findOneAndUpdate(
					{ x: teleport.x, y: teleport.y, valeur: 0 },
					{ $inc: { valeur: 1 }, $addToSet: { agents: agentId } },
					{ returnDocument: 'after' }
				);
				if (reserved) {
					x = reserved.x!;
					y = reserved.y!;
					console.log(
						`Agent ${agentId} teleports to cell (${x}, ${y}), value: ${reserved.valeur}`
					);
					await new Promise(resolve => setTimeout(resolve, DELAY));
				}
			}
		}

		const endTime = Date.now();
		const durationSec = ((endTime - startTime) / 1000).toFixed(2);
		console.log(`Agent ${agentId} finished in ${durationSec} seconds.`);

		// isExploring = false;
	})();
});

export default router;
