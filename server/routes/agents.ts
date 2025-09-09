import express from 'express';
import { getCellsCollection } from '../models/Cell.js';

const router = express.Router();

router.get('/', async (_req, res) => {
	const stats = await getCellsCollection()
		.aggregate([
			{ $unwind: '$agents' },
			{ $group: { _id: '$agents', count: { $sum: 1 } } },
			{ $sort: { count: -1 } },
		])
		.toArray();
	res.json(stats);
});

export default router;
