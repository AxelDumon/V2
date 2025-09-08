import express from 'express';
import dotenv from 'dotenv';
import { getCellsCollection } from '../models/Cell.ts';
dotenv.config();

const router = express.Router();
const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;

router.post('/', async (_req, res) => {
	await getCellsCollection().deleteMany({});
	const bulk = [];
	for (let i = 0; i < SIZE; i++) {
		for (let j = 0; j < SIZE; j++) {
			bulk.push({ x: i, y: j, valeur: 0 });
		}
	}
	await getCellsCollection().insertMany(bulk);
	res.json({ status: 'initialized', count: bulk.length });
});

export default router;
