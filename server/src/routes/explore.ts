import express from 'express';
import type { Request, Response } from 'express';

import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid';
import { CellService } from '../models/CellService.js';
import Agent from '../models/Agent.js';
// import { onAgentStatsUpdated, onCellReserved } from '../utils/WebSocket.js';

const router = express.Router();
const DELAY = process.env.DELAY ? Number(process.env.DELAY) : 100;
let isExploring = false;
// let pendingCells: Cell[] = [];
// let pendingAgentUpdates: { name: string; update: any }[] = [];

// Start exploration with a new agent
router.post('/', async (_req: Request, res: Response) => {
	if (isExploring) return res.json({ status: 'already exploring' });
	isExploring = true;
	console.log('AGENT_NAME:', process.env.AGENT_NAME);
	const agentName = process.env.AGENT_NAME || process.env.AGENT_ID || uuidv4();
	console.log(`Agent ${agentName} started exploring.`);
	res.json({ status: 'started' });
	console.log(`[Exploration] Agent ${agentName} begins exploration.`);

	(async () => {
		let x: number = 0;
		let y: number = 0;

		// Starts timer
		const startTime = Date.now();

		Agent.updateExploringTime(true);

		let cell = await CellService.getRandomUndiscoverdCell();
		if (!cell) {
			console.log(
				`[Exploration] Agent ${agentName}: No undiscovered cells found, exiting.`
			);
			isExploring = false;
			return;
		}

		x = cell.x;
		y = cell.y;

		while (true) {
			let foundFrontier = false;
			const neighbors = await CellService.getUndiscoveredNeighbors(x, y);
			console.log(`Agent ${agentName} at (${x}, ${y}) checking neighbors...`);
			neighbors.forEach((neighbor, index) => {
				console.log(`Neighbor ${index}:`, neighbor);
			});
			if (neighbors && neighbors.length > 0) {
				const dbCell = neighbors[Math.floor(Math.random() * neighbors.length)];
				const nx = dbCell.x;
				const ny = dbCell.y;
				// Try to reserve in DB
				try {
					const reserved = await CellService.incrementValue(
						`${nx}-${ny}`,
						agentName
					);

					if (reserved) {
						x = nx;
						y = ny;
						console.log(
							`Agent ${agentName} explored frontier cell (${x}, ${y}), value: ${reserved.valeur}`
						);

						await new Promise(resolve => setTimeout(resolve, DELAY));
						foundFrontier = true;
					}
				} catch (error) {
					x = nx;
					y = ny;
					foundFrontier = true;
					console.log(
						`CouchDB error during increment for (${nx}, ${ny}):`,
						error
					);
					await new Promise(resolve => setTimeout(resolve, DELAY));
				}
			}

			if (!foundFrontier) {
				try {
					console.log(
						`Agent ${agentName}: No adjacent frontier found, teleporting...`
					);
					const undiscovered = await CellService.getRandomUndiscoverdCell();
					if (!undiscovered) {
						console.log(
							`Agent ${agentName}: No undiscovered cells left, finishing exploration.`
						);
						break;
					}
					console.log('undiscovered: ' + undiscovered.x + ',' + undiscovered.y);
					const reserved = await CellService.incrementValue(
						`${undiscovered.x}-${undiscovered.y}`,
						agentName
					);
					if (reserved) {
						x = reserved.x;
						y = reserved.y;
						console.log(
							`Agent ${agentName} teleports to cell (${x}, ${y}), value: ${reserved.valeur}`
						);

						// onCellReserved(reserved);
						await new Promise(resolve => setTimeout(resolve, DELAY));
					}
				} catch (error) {
					console.error('CouchDB error during teleport:', error);
					await new Promise(resolve => setTimeout(resolve, DELAY));
				}
			}
		}

		// End timer and log duration
		const endTime = Date.now();
		// try {
		Agent.updateExploringTime(false);

		// const stats = await Agent.getAgentStatsWithDuration();
		// onAgentStatsUpdated(stats);
		// onAgentStatsUpdated(stats);

		const durationSec = ((endTime - startTime) / 1000).toFixed(2);
		console.log(
			`[Exploration] Agent ${agentName} finished in ${durationSec} seconds.`
		);

		isExploring = false;
	})();
});

// setInterval(async () => {
// 	console.log(
// 		`Syncing ${pendingCells.length} pending cells and ${pendingAgentUpdates.length} pending agent updates...`
// 	);
// 	if (pendingCells.length > 0) {
// 		try {
// 			const stillPending: Cell[] = [];
// 			for (const cell of pendingCells) {
// 				const result = await getCellsCollection().findOneAndUpdate(
// 					{ x: cell.x, y: cell.y },
// 					{ $inc: { valeur: 1 }, $addToSet: { agents: cell.agents[0] } },
// 					{ returnDocument: 'after', includeResultMetadata: true }
// 				);
// 				if (result?.lastErrorObject?.updatedExisting === false) {
// 					stillPending.push(cell);
// 				}
// 			}
// 			pendingCells = stillPending;
// 			console.log('Pending cells synced to MongoDB!');

// 			// const copy = [...pendingCells];
// 			// for (const cell of copy) {
// 			// 	await getCellsCollection().findOneAndUpdate(
// 			// 		{ x: cell.x, y: cell.y },
// 			// 		{ $inc: { valeur: 1 }, $addToSet: { agents: cell.agents[0] } },
// 			// 		{ returnDocument: 'after' }
// 			// 	);
// 			// 	pendingCells.shift();
// 			// }
// 		} catch (err) {
// 			console.error('Still cannot sync pending cells:', err);
// 		}
// 	}

// 	if (pendingAgentUpdates.length > 0) {
// 		try {
// 			const stillPending: typeof pendingAgentUpdates = [];
// 			for (const upd of pendingAgentUpdates) {
// 				try {
// 					await getAgentsCollection().updateOne({ name: upd.name }, upd.update);
// 				} catch (err) {
// 					stillPending.push(upd);
// 				}
// 			}
// 			pendingAgentUpdates = stillPending;
// 			if (stillPending.length === 0) {
// 				console.log('Pending agent updates synced to MongoDB!');
// 			}
// 		} catch (err) {
// 			console.error('Still cannot sync pending agent updates:', err);
// 		}
// 	}
// }, 3000);

export default router;
