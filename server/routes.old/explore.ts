import express from 'express';
import type { Request, Response } from 'express';

import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid';
import { Cell, getCellsCollection } from '../models/Cell.js';
import { getAgentsCollection } from '../models/Agent.js';

const router = express.Router();
const DELAY = process.env.DELAY ? Number(process.env.DELAY) : 100;
const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;
let isExploring = false;
let pendingCells: Cell[] = [];
let pendingAgentUpdates: { name: string; update: any }[] = [];

// Receive bulk explored cells from a peer
router.post('/api/sync', async (req: Request, res: Response) => {
	const { cells } = req.body;
	// Add the received tiles to the local DB
	for (const cell of cells) {
		await getCellsCollection().findOneAndUpdate(
			{ x: cell.x, y: cell.y },
			{ $inc: { valeur: 1 }, $addToSet: { agents: cells.agents.pop() } },
			{ returnDocument: 'after' }
		);
	}
	res.json({ status: 'ok' });
});

// Shuffle an array randomly
function shuffle<T>(arr: T[]): T[] {
	return arr.sort(() => Math.random() - 0.5);
}

function isCellDiscovered(x: number, y: number, dbCell: Cell | null): boolean {
	// Check DB cell
	if (dbCell && dbCell.valeur > 0) return true;
	// Check pendingCells
	return pendingCells.some(
		cell => cell.x === x && cell.y === y && cell.valeur > 0
	);
}

// Start exploration with a new agent
router.post('/', async (_req: Request, res: Response) => {
	if (isExploring) return res.json({ status: 'already exploring' });
	isExploring = true;
	console.log('AGENT_ID:', process.env.AGENT_ID);
	console.log('AGENT_NAME:', process.env.AGENT_NAME);
	const agentName = process.env.AGENT_NAME || process.env.AGENT_ID || uuidv4();
	console.log(`Agent ${agentName} started exploring.`);
	res.json({ status: 'started' });

	(async () => {
		let x: number = 0;
		let y: number = 0;

		// Starts timer
		const startTime = Date.now();

		try {
			await getAgentsCollection().updateOne(
				{ name: agentName },
				{ $set: { startTime: new Date() } },
				{ upsert: true }
			);
		} catch (err) {
			console.error('Failed to log agent start time:', err);
			pendingAgentUpdates.push({
				name: agentName,
				update: { $set: { startTime: new Date() }, upsert: true },
			});
		}

		let cell = await getCellsCollection()
			.aggregate([{ $match: { valeur: 0 } }, { $sample: { size: 1 } }])
			.toArray();
		if (cell.length === 0) return;

		x = cell[0].x;
		y = cell[0].y;

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
					let dbCell: Cell | null = null;
					try {
						dbCell = await getCellsCollection().findOne({ x: nx, y: ny });
					} catch (error) {
						// If DB is unreachable, dbCell stays null
						console.error('Failed to fetch cell from DB:', error);
					}
					// Check if discovered in DB or pendingCells
					if (!isCellDiscovered(nx, ny, dbCell)) {
						// Try to reserve in DB
						try {
							const reserved = await getCellsCollection().findOneAndUpdate(
								{ x: nx, y: ny, valeur: 0 },
								{ $inc: { valeur: 1 }, $addToSet: { agents: agentName } },
								{ returnDocument: 'after', includeResultMetadata: true }
							);
							if (reserved) {
								if (reserved.lastErrorObject?.updatedExisting === false) {
									pendingCells.push(reserved.value!);
								}
								pendingCells = pendingCells.filter(
									cell => !(cell.x === nx && cell.y === ny)
								);
								x = nx;
								y = ny;
								console.log(
									`Agent ${agentName} explores frontier cell (${x}, ${y}), value: ${reserved.value?.valeur}`
								);
								await new Promise(resolve => setTimeout(resolve, DELAY));

								foundFrontier = true;
								break;
							}
						} catch (error) {
							// Offline: update pendingCells
							pendingCells.push({
								x: nx,
								y: ny,
								valeur: 1,
								agents: [agentName],
							});
							x = nx;
							y = ny;
							foundFrontier = true;
							console.log(
								`Agent ${agentName} (offline) explores frontier cell (${x}, ${y}), value: 1`
							);
							await new Promise(resolve => setTimeout(resolve, DELAY));
							break;
						}
					}
				}
			}

			if (!foundFrontier) {
				try {
					console.log(
						`Agent ${agentName}: No adjacent frontier found, teleporting...`
					);
					const undiscovered = await getCellsCollection()
						.aggregate([{ $match: { valeur: 0 } }, { $sample: { size: 1 } }])
						.toArray();
					if (undiscovered.length === 0) break;

					const teleport = undiscovered[0];
					if (
						pendingCells.some(
							cell => cell.x === teleport.x && cell.y === teleport.y
						)
					)
						continue;
					const reserved = await getCellsCollection().findOneAndUpdate(
						{ x: teleport.x, y: teleport.y, valeur: 0 },
						{ $inc: { valeur: 1 }, $addToSet: { agents: agentName } },
						{ returnDocument: 'after', includeResultMetadata: true }
					);
					if (reserved) {
						if (reserved.lastErrorObject?.updatedExisting === false) {
							pendingCells.push(reserved.value!);
						}
						x = reserved.value!.x!;
						y = reserved.value!.y!;
						console.log(
							`Agent ${agentName} teleports to cell (${x}, ${y}), value: ${reserved.value!.valeur}`
						);
						await new Promise(resolve => setTimeout(resolve, DELAY));
					}
				} catch (error) {
					pendingCells.push({ x: x, y: y, valeur: 1, agents: [agentName] });
					console.error(
						'MongoDB error during teleport, storing cell locally:',
						error
					);
					await new Promise(resolve => setTimeout(resolve, DELAY));
				}
			}
		}

		// End timer and log duration
		const endTime = Date.now();
		try {
			await getAgentsCollection().updateOne(
				{ name: agentName },
				{ $set: { endTime: new Date() } }
			);
		} catch (err) {
			console.error('Failed to log agent end time:', err);
			pendingAgentUpdates.push({
				name: agentName,
				update: { $set: { endTime: new Date() } },
			});
		}
		const durationSec = ((endTime - startTime) / 1000).toFixed(2);
		console.log(`Agent ${agentName} finished in ${durationSec} seconds.`);

		isExploring = false;
	})();
});

setInterval(async () => {
	console.log(
		`Syncing ${pendingCells.length} pending cells and ${pendingAgentUpdates.length} pending agent updates...`
	);
	if (pendingCells.length > 0) {
		try {
			const stillPending: Cell[] = [];
			for (const cell of pendingCells) {
				const result = await getCellsCollection().findOneAndUpdate(
					{ x: cell.x, y: cell.y },
					{ $inc: { valeur: 1 }, $addToSet: { agents: cell.agents[0] } },
					{ returnDocument: 'after', includeResultMetadata: true }
				);
				if (result?.lastErrorObject?.updatedExisting === false) {
					stillPending.push(cell);
				}
			}
			pendingCells = stillPending;
			console.log('Pending cells synced to MongoDB!');

			// const copy = [...pendingCells];
			// for (const cell of copy) {
			// 	await getCellsCollection().findOneAndUpdate(
			// 		{ x: cell.x, y: cell.y },
			// 		{ $inc: { valeur: 1 }, $addToSet: { agents: cell.agents[0] } },
			// 		{ returnDocument: 'after' }
			// 	);
			// 	pendingCells.shift();
			// }
		} catch (err) {
			console.error('Still cannot sync pending cells:', err);
		}
	}

	if (pendingAgentUpdates.length > 0) {
		try {
			const stillPending: typeof pendingAgentUpdates = [];
			for (const upd of pendingAgentUpdates) {
				try {
					await getAgentsCollection().updateOne({ name: upd.name }, upd.update);
				} catch (err) {
					stillPending.push(upd);
				}
			}
			pendingAgentUpdates = stillPending;
			if (stillPending.length === 0) {
				console.log('Pending agent updates synced to MongoDB!');
			}
		} catch (err) {
			console.error('Still cannot sync pending agent updates:', err);
		}
	}
}, 3000);

export default router;
