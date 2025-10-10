import dotenv from 'dotenv';
dotenv.config();

import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({port : process.env.WS_PORT ? Number(process.env.WS_PORT) : 8080});

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
import cellsRouter from './routes/cells.js';
import exploreRouter from './routes/explore.js';
import initRouter from './routes/init.js';
import agentsRouter from './routes/agents.js';
import cors from 'cors';
import { Agent } from './models/Agent.js';
import { MongoManager } from './models/BaseManager/MongoManager.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.get('/', (_req, res) => {
	res.send('Agent is running!');
});
app.use('/api/cells', cellsRouter);
app.use('/api/explore', exploreRouter);
app.use('/api/init', initRouter);
app.use('/api/agents', agentsRouter);

async function startServer() {
	app.listen(PORT, '0.0.0.0', () => {
		console.log(`Serveur lancé sur le port ${PORT}`);
	});
}

const name = process.env.AGENT_NAME || 'Agent';

// LINE TO CHANGE IF YOU CHANGE DB
Agent.setBaseManager(await (new MongoManager().ManagerFactory()));

export const agent = new Agent(name, name); 
export const parameters = {
	SIZE: process.env.SIZE ? Number(process.env.SIZE) : 20,
	DELAY: process.env.DELAY ? Number(process.env.DELAY) : 100
}

startServer().catch(console.dir);
