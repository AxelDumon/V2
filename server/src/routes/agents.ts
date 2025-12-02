import express from 'express';
import Agent from '../models/Agent.js';

const router = express.Router();

router.get('/', async (_req, res) => {
	try {
		const stats = await Agent.getAgentStatsWithDuration();
		res.json(stats);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch agent stats' });
	}
});

export default router;
