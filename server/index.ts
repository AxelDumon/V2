import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cellsRouter from './routes/cells.js';
import exploreRouter from './routes/explore.js';
import initRouter from './routes/init.js';
import agentsRouter from './routes/agents.js';
import cors from 'cors';
import { setCellsCollection } from './models/Cell.js';
import type { Cell } from './models/Cell.js';

const app = express();
const PORT = process.env.PORT || 3001;

const { MongoClient, ServerApiVersion } = await import('mongodb');
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/v2grid';

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

app.use(cors());
app.use(express.json());
app.use('/api/cells', cellsRouter);
app.use('/api/explore', exploreRouter);
app.use('/api/init', initRouter);
app.use('/api/agents', agentsRouter);

async function run() {
	try {
		await client.connect();
		await client.db('admin').command({ ping: 1 });
		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!'
		);

		const db = client.db('v2grid');
		setCellsCollection(db.collection('cells'));

		// Init
		const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;
		const cellsCollection = db.collection('cells');
		await cellsCollection.deleteMany({});
		const bulk: Cell[] = [];
		for (let i = 0; i < SIZE; i++) {
			for (let j = 0; j < SIZE; j++) {
				bulk.push({ x: i, y: j, valeur: 0, agents: [] });
			}
		}
		await cellsCollection.insertMany(bulk);
		console.log(`Grille initialisée (${bulk.length} cases)`);

		app.listen(PORT, async () => {
			console.log(`Serveur lancé sur le port ${PORT}`);
		});
	} finally {
		// await client.close();
	}
}
run().catch(console.dir);

// mongoose
// 	.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/v2grid', {})
// 	.then(async () => {
// 		console.log('MongoDB connecté');

// 		// Initialisation de la grille à chaque démarrage
// 		const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;
// 		const Cell = (await import('./models/Cell.ts')).default;
// 		await Cell.deleteMany({});
// 		const bulk: any[] = [];
// 		for (let i = 0; i < SIZE; i++) {
// 			for (let j = 0; j < SIZE; j++) {
// 				bulk.push({ x: i, y: j, valeur: 0 });
// 			}
// 		}
// 		await Cell.insertMany(bulk);
// 		console.log(`Grille initialisée (${bulk.length} cases)`);

// 		app.listen(PORT, () => {
// 			console.log(`Serveur lancé sur le port ${PORT}`);
// 		});
// 	})
// 	.catch(err => {
// 		console.error('Erreur de connexion MongoDB:', err);
// 	});
