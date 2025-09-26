import express from 'express';
import { CouchDB } from '../utils/CouchDB.js';

const router = express.Router();

// Get all cells
router.get('/', async (_req, res) => {
	try {
		const response = await fetch(
			`${CouchDB.dbUrl}/_all_docs?include_docs=true`,
			{
				headers: { Authorization: CouchDB.authHeader },
			}
		);
		const data = await response.json();
		res.json(data.rows.map((row: any) => row.doc));
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch cells' });
	}
});

// Add a new cell
router.post('/', async (req, res) => {
	try {
		const cell = req.body;
		const response = await fetch(`${CouchDB.dbUrl}`, {
			method: 'POST',
			headers: {
				Authorization: CouchDB.authHeader,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(cell),
		});
		const data = await response.json();
		res.status(201).json(data);
	} catch (error) {
		res.status(500).json({ error: 'Failed to add cell' });
	}
});

// Update a cell
router.put('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const cell = req.body;
		const response = await fetch(`${CouchDB.dbUrl}/${id}`, {
			method: 'PUT',
			headers: {
				Authorization: CouchDB.authHeader,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(cell),
		});
		const data = await response.json();
		res.json(data);
	} catch (error) {
		res.status(500).json({ error: 'Failed to update cell' });
	}
});

// Delete a cell
router.delete('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const rev = req.query.rev as string;
		const response = await fetch(`${CouchDB.dbUrl}/${id}?rev=${rev}`, {
			method: 'DELETE',
			headers: { Authorization: CouchDB.authHeader },
		});
		const data = await response.json();
		res.json(data);
	} catch (error) {
		res.status(500).json({ error: 'Failed to delete cell' });
	}
});

export default router;
