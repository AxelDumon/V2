import express from 'express';
import dotenv from 'dotenv';
import { CellService } from '../models/CellService.js';
dotenv.config();

const router = express.Router();

router.post('/', async (_req, res) => {
	await CellService.deleteAll();

	const n = await CellService.initGrid();
	res.json({ status: 'initialized', count: n });
});

export default router;
