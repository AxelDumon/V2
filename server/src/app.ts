import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
// import cellsRouter from './routes/cells.js';
// import exploreRouter from './routes/explore.js';
// import initRouter from './routes/init.js';
// import agentsRouter from './routes/agents.js';
import cors from 'cors';
import { countCells, initGrid } from './models/Cell.js';
import { CouchDB } from './utils/CouchDB.js';
import designDocs, { DesignDocs } from './models/views/index.js';

console.log('--- ENV VARIABLES ---');
console.log('PORT:', process.env.PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('URI:', process.env.URI);
console.log('AGENT_ID:', process.env.AGENT_ID);
console.log('AGENT_NAME:', process.env.AGENT_NAME);
console.log('SIZE:', process.env.SIZE);
console.log('---------------------');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// app.use(cors({ origin: `http://localhost:800${PORT.toString().charAt(3)}` }));
app.use(cors());
app.use(express.json());
app.get('/', (_req, res) => {
	res.send('Agent is running!');
});
// app.use('/api/cells', cellsRouter);
// app.use('/api/explore', exploreRouter);
// app.use('/api/init', initRouter);
// app.use('/api/agents', agentsRouter);

// let dbName = process.env.DB_NAME || 'v2grid';

const user = process.env.COUCHDB_USER;
const password = process.env.COUCHDB_PASSWORD;
export const authHeader =
	'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');

// const url = `http://127.0.0.1:5984/${dbName}`;

async function initDBAndStartServer() {
	let initialized = false;
	let retryDelay = 2000;
	const maxDelay = 8000;

	await CouchDB.createDatabase().catch(err => {
		console.error('Error creating database:', err);
	});

	while (!initialized) {
		try {
			// const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;
			const count = await countCells();
			if (count === 0) {
				await initGrid();
			} else {
				console.log(`Grille déjà initialisée (${count} cases)`);
			}

			app.listen(PORT, '0.0.0.0', () => {
				console.log(`Serveur lancé sur le port ${PORT}`);
			});
			initialized = true;
		} catch (err: Error | any) {
			if (err.code === 'EAI_AGAIN' || err.code === 'ENOTFOUND') {
				console.log('DNS error detected, switching to direct connection mode.');
			}
			console.error(
				`DB connection/init failed, retrying in ${retryDelay / 1000}s...`,
				err
			);
			await new Promise(res => setTimeout(res, retryDelay));
			retryDelay = Math.min(retryDelay * 2, maxDelay);
		}
	}
}

initDBAndStartServer().catch(console.dir);

// Upload the design document on startup
(async () => {
	const docs: DesignDocs = designDocs;

	for (const [name, designDoc] of Object.entries(docs)) {
		console.log(`Uploading design document: ${name}`);
		await CouchDB.uploadDesignDoc(designDoc);
	}
})();

// Routes
app.get('/api/view/by_value', async (req, res) => {
	try {
		const query = req.query as Record<string, string>;
		const rows = await CouchDB.queryView('by_value', query);
		res.json(rows);
	} catch (error) {
		res.status(500).json({ error: 'Failed to query view' });
	}
});

app.get('/api/view/by_coordinates', async (req, res) => {
	try {
		const query = req.query as Record<string, string>;
		const rows = await CouchDB.queryView('by_coordinates', query);
		res.json(rows);
	} catch (error) {
		res.status(500).json({ error: 'Failed to query view' });
	}
});

// Start the server
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
