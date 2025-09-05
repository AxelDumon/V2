import express from 'express';
import Cell from '../models/Cell.ts';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;

router.post('/', async (_req, res) => {
	await Cell.deleteMany({});
	const bulk = [];
	for (let i = 0; i < SIZE; i++) {
		for (let j = 0; j < SIZE; j++) {
			bulk.push({ x: i, y: j, valeur: 0 });
		}
	}
	await Cell.insertMany(bulk);
	res.json({ status: 'initialized', count: bulk.length });
});

export default router;
