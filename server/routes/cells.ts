import express from 'express';
import { Agent } from '../models/Agent.js';

const router = express.Router();

router.get('/', async (_req, res) => {
	const cells = Agent.getCellRepository().findAll();
	res.json(cells);
});

export default router;
