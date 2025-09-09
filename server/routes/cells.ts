import express from 'express';
import { getCellsCollection } from '../models/Cell.js';
import type { Cell } from '../models/Cell.js';

const router = express.Router();

router.post('/', async (req: any, res: any) => {
	try {
		const cell: Cell = req.body;
		await getCellsCollection().insertOne(cell);
		res.status(201).json(cell);
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

router.get('/', async (_req: any, res: any) => {
	try {
		const cells = await getCellsCollection().find().toArray();
		res.json(cells);
	} catch (err: Error | any) {
		res.status(500).json({ error: err.message });
	}
});

router.put('/:id', async (req: any, res: any) => {
	try {
		const cell = (await getCellsCollection().findOneAndUpdate(
			{ _id: req.params.id },
			{ $set: req.body },
			{ returnDocument: 'after' }
		)) as Cell | null;

		if (!cell) {
			return res.status(404).json({ error: 'Cell not found' });
		}

		res.json(cell);
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

router.delete('/:id', async (req: any, res: any) => {
	try {
		await getCellsCollection().deleteOne({ _id: req.params.id });
		res.status(204).end();
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

router.delete('/', async (_req: any, res: any) => {
	try {
		await getCellsCollection().deleteMany({});
		res.status(204).end();
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

export default router;
