import express from 'express';
import type { Request, Response } from 'express';

import dotenv from 'dotenv';
dotenv.config();

import { agent, parameters } from '../app.js';

const router = express.Router();

// Start exploration with a new agent
router.post('/', async (_req: Request, res: Response) => {
	const exploration = agent.explore(parameters.DELAY);
	res.json({ message: 'Exploration started' });
	exploration.then(() => {
		console.log('Exploration finished');
		res.json({ message: 'Exploration finished' });
	})
});

export default router;
