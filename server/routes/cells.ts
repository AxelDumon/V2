import express from 'express';
import Cell from '../models/Cell.ts';

const router = express.Router();

// Créer une case
router.post('/', async (req: any, res: any) => {
	try {
		const cell = new Cell(req.body);
		await cell.save();
		res.status(201).json(cell);
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

// Récupérer toutes les cases
router.get('/', async (_req: any, res: any) => {
	try {
		const cells = await Cell.find();
		res.json(cells);
	} catch (err: Error | any) {
		res.status(500).json({ error: err.message });
	}
});

// Mettre à jour une case
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

// Supprimer une case
router.delete('/:id', async (req: any, res: any) => {
	try {
		await Cell.findByIdAndDelete(req.params.id);
		res.status(204).end();
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

// Supprimer toutes les cases
router.delete('/', async (_req: any, res: any) => {
	try {
		await Cell.deleteMany({});
		res.status(204).end();
	} catch (err: Error | any) {
		res.status(400).json({ error: err.message });
	}
});

export default router;
