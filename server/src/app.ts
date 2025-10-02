import dotenv from 'dotenv';
dotenv.config();

import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
	port: Number('808' + process.env.PORT?.charAt(3)),
});
wss.on('connection', ws => {
	console.log('[WSS] Client connected');
	ws.onopen = () => {
		console.log('Connected to WebSocket server');
	};
	ws.on('message', message => {
		console.log('Received message:', message.toString());
	});
	ws.on('close', () => {
		console.log('Client disconnected');
	});
	ws.on('error', error => {
		console.error('WebSocket error:', error);
	});
});

export default wss;

import express from 'express';
import cors from 'cors';
import { CouchDB } from './utils/CouchDB.js';
import designDocs from './models/views/index.js';
import { CellService } from './models/CellService.js';

import cellsRouter from './routes/cells.js';
import exploreRouter from './routes/explore.js';
import agentsRouter from './routes/agents.js';
import initRouter from './routes/init.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// app.use(cors({ origin: `http://localhost:800${PORT.toString().charAt(3)}` }));
app.use(cors());
app.use(express.json());
app.get('/', (_req, res) => {
	res.send('Agent is running!');
});
app.use('/api/cells', cellsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/init', initRouter);
app.use('/api/explore', exploreRouter);

async function initDB() {
	try {
		await CouchDB.createDatabase();
		for (const [name, designDoc] of Object.entries(designDocs)) {
			console.log(`Uploading design document: ${name}`);
			await CouchDB.uploadDesignDoc(designDoc);
		}
		console.log('CouchDB initialized successfully.');

		const cellNumber = await CellService.countCells();
		if (cellNumber === 0) CellService.initGrid();
		else console.log(`Grille déjà initialisée (${cellNumber} cases)`);
	} catch (error) {
		console.error('Error initializing CouchDB:', error);
	}
}

async function initDBAndStartServer() {
	await initDB();
	app.listen(PORT, '0.0.0.0', () => {
		console.log(`Serveur lancé sur le port ${PORT}`);
	});
}

// Routes
app.get('/api/view/by_value', async (req, res) => {
	try {
		const query = req.query as Record<string, string>;
		const rows = await CouchDB.findView('cell_views', 'by_value', query);
		res.json(rows);
	} catch (error) {
		res.status(500).json({ error: 'Failed to query view' });
	}
});

app.get('/api/view/by_coordinates', async (req, res) => {
	try {
		const query = req.query as Record<string, string>;
		const rows = await CouchDB.findView('cell_views', 'by_coordinates', query);
		res.json(rows);
	} catch (error) {
		res.status(500).json({ error: 'Failed to query view' });
	}
});

initDBAndStartServer().catch(console.dir);
// let repPromise =
CouchDB.monitorReplication().catch(console.error);
// let confPromise =
CouchDB.monitorConflicts().catch(console.error);
// while (true) {
// 	if (repPromise === undefined)
// 		repPromise = CouchDB.monitorReplication().catch(console.error);
// 	if (confPromise === undefined)
// 		confPromise = CouchDB.monitorConflicts().catch(console.error);
// }
