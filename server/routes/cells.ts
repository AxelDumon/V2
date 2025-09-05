import express from 'express';
import Cell from '../models/Cell.ts';

const router = express.Router();

router.post('/', async (req: any, res: any) => {
	try {
		const cell = new Cell(req.body);
		await cell.save();
		res.status(201).json(cell);
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

router.get('/', async (_req: any, res: any) => {
	try {
		const cells = await Cell.find();
		res.json(cells);
	} catch (err: Error | any) {
		res.status(500).json({ error: err.message });
	}
});

router.put('/:id', async (req: any, res: any) => {
	try {
		const cell = await Cell.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
		});
		res.json(cell);
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

router.delete('/:id', async (req: any, res: any) => {
	try {
		await Cell.findByIdAndDelete(req.params.id);
		res.status(204).end();
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

router.delete('/', async (_req: any, res: any) => {
	try {
		await Cell.deleteMany({});
		res.status(204).end();
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

export default router;
