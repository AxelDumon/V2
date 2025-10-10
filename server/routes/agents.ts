import express from 'express';
import { Agent } from '../models/Agent';

const router = express.Router();

router.get('/', async (_req, res) => {
	try {
		const stats = await Agent.getAgentRepository().getAgentStatsWithDuration();
		res.json(stats);
	} catch (err: Error | any) {
		res.status(500).json({ error: err.message });
	}
});

export default router;
