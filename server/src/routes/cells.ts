import express from 'express';
import { CellService } from '../models/CellService.js';

const router = express.Router();

router.get('/', async (_req, res) => {
	const cellsDoc = await CellService.getAllCells();
	res.json(cellsDoc);
});

export default router;
