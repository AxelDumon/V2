import express from 'express';
import Cell from '../models/Cell.ts';

const router = express.Router();

router.get('/', async (_req, res) => {
	// Agrège le nombre de cases parcourues par chaque agent
	const stats = await Cell.aggregate([
		{ $unwind: '$agents' },
		{ $group: { _id: '$agents', count: { $sum: 1 } } },
		{ $sort: { count: -1 } },
	]);
	res.json(stats);
});

export default router;
