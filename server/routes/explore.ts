import express from 'express';
import type { Request, Response } from 'express';

import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid';
import { Cell, getCellsCollection } from '../models/Cell.js';
import { getAgentsCollection } from '../models/Agent.js';
import { ObjectId } from 'mongodb';

const router = express.Router();
const DELAY = process.env.DELAY ? Number(process.env.DELAY) : 100;
const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;
let isExploring = false;

// function randInt(max: number): number {
// 	return Math.floor(Math.random() * max);
// }

async function sendExploredCases(peerUrl: string, cells: Cell[]) {
	try {
		await fetch(`${peerUrl}/api/cells/bulk`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(cells),
		});
		console.log(`Sent ${cells.length} explored cells to ${peerUrl}`);
	} catch (error) {
		console.error(`Failed to send cells to ${peerUrl}:`, error);
	}
}

// Broadcast explored cells to all peers
async function broadcastExploredCases(cells: any[]) {
	const peers = process.env.PEERS ? process.env.PEERS.split(',') : [];
	for (const peer of peers) {
		await sendExploredCases(peer.trim(), cells);
	}
}

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
		// await getCellsCollection().insertMany(cells, { ordered: false });
	}
	res.json({ status: 'ok' });
});

// Shuffle an array randomly
function shuffle<T>(arr: T[]): T[] {
	return arr.sort(() => Math.random() - 0.5);
}

// Start exploration with a new agent
router.post('/', async (_req: Request, res: Response) => {
	if (isExploring) return res.json({ status: 'already exploring' });
	isExploring = true;
	const agentId = process.env.AGENT_ID ? process.env.AGENT_ID : uuidv4();
	console.log(`Agent ${agentId} started exploring.`);
	res.json({ status: 'started' });

	(async () => {
		// Starts timer
		const startTime = Date.now();
		await getAgentsCollection().updateOne(
			{ _id: new ObjectId(agentId) },
			{ $set: { startTime: new Date() } },
			{ upsert: true }
		);
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
						await broadcastExploredCases([reserved]);
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
					await broadcastExploredCases([reserved]);
					x = reserved.x!;
					y = reserved.y!;
					console.log(
						`Agent ${agentId} teleports to cell (${x}, ${y}), value: ${reserved.valeur}`
					);
					await new Promise(resolve => setTimeout(resolve, DELAY));
				}
			}
		}

		// End timer and log duration
		const endTime = Date.now();
		await getAgentsCollection().updateOne(
			{ _id: new ObjectId(agentId) },
			{ $set: { endTime: new Date() } }
		);
		const durationSec = ((endTime - startTime) / 1000).toFixed(2);
		console.log(`Agent ${agentId} finished in ${durationSec} seconds.`);

		isExploring = false;
	})();
});

export default router;
