import express from 'express';
import { getCellsCollection } from '../models/Cell.js';
import { getAgentsCollection } from '../models/Agent.js';

const router = express.Router();

router.get('/', async (_req, res) => {
	const stats = await getCellsCollection()
		.aggregate([
			{ $unwind: '$agents' },
			{ $group: { _id: '$agents', count: { $sum: 1 } } },
			{ $sort: { count: -1 } },
		])
		.toArray();

	const agents = await getAgentsCollection().find({}).toArray();
	const statsWithTime = stats.map(stat => {
		const agent = agents.find(a => a.name === stat._id);
		let duration = null;
		if (agent?.startTime && agent?.endTime) {
			duration =
				(new Date(agent.endTime).getTime() -
					new Date(agent.startTime).getTime()) /
				1000;
		}
		return { ...stat, name: agent?.name || stat._id, duration };
	});

	res.json(statsWithTime);
});

export default router;
