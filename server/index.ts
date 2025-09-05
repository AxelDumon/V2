import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import express from 'express';
import cellsRouter from './routes/cells.ts';
import exploreRouter from './routes/explore.ts';
import initRouter from './routes/init.ts';
import agentsRouter from './routes/agents.ts';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api/cells', cellsRouter);
app.use('/api/explore', exploreRouter);
app.use('/api/init', initRouter);
app.use('/api/agents', agentsRouter);

mongoose
	.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/v2grid', {})
	.then(async () => {
		console.log('MongoDB connecté');

		// Initialisation de la grille à chaque démarrage
		const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;
		const Cell = (await import('./models/Cell.ts')).default;
		await Cell.deleteMany({});
		const bulk: any[] = [];
		for (let i = 0; i < SIZE; i++) {
			for (let j = 0; j < SIZE; j++) {
				bulk.push({ x: i, y: j, valeur: 0 });
			}
		}
		await Cell.insertMany(bulk);
		console.log(`Grille initialisée (${bulk.length} cases)`);

		app.listen(PORT, () => {
			console.log(`Serveur lancé sur le port ${PORT}`);
		});
	})
	.catch(err => {
		console.error('Erreur de connexion MongoDB:', err);
	});
