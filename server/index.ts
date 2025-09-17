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
import { setAgentsCollection } from './models/Agent.js';
import { MongoClient as MongoClientType } from 'mongodb';

console.log('--- ENV VARIABLES ---');
console.log('PORT:', process.env.PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('REPL_MONGO_URI:', process.env.REPL_MONGO_URI);
console.log('AGENT_ID:', process.env.AGENT_ID);
console.log('AGENT_NAME:', process.env.AGENT_NAME);
console.log('SIZE:', process.env.SIZE);
console.log('---------------------');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const { MongoClient } = await import('mongodb');

// app.use(cors({ origin: `http://localhost:800${PORT.toString().charAt(3)}` }));
app.use(cors());
app.use(express.json());
app.get('/', (_req, res) => {
	res.send('Agent is running!');
});
app.use('/api/cells', cellsRouter);
app.use('/api/explore', exploreRouter);
app.use('/api/init', initRouter);
app.use('/api/agents', agentsRouter);

let currentMode: 'replicaSet' | 'direct' = 'replicaSet';
let client: MongoClientType | null = null;
let dbReady = false;
let dbName = process.env.DB_NAME || 'v2grid';

const replicaSetUri = `mongodb://machine1:27018,machine2:27018,machine3:27018/${dbName}?replicaSet=shard1`;
const directUri = `mongodb://localhost:27018/${dbName}?directConnection=true`;

async function connectMongoDB() {
	let uri = currentMode === 'replicaSet' ? replicaSetUri : directUri;
	let options: any = { serverApi: { version: '1' } };
	console.log('Attempting MongoDB connection in', currentMode, 'mode...');
	try {
		if (client) await client.close();
		client = new MongoClient(uri, options);
		await client.connect();
		await safePing(client);
		console.log(`Connected to MongoDB (${currentMode})`);
		dbReady = true;
		return client;
	} catch (error) {
		console.error(`MongoDB ${currentMode} connection failed:`, error);
		dbReady = false;
		return null;
	}
}

async function initDBAndStartServer() {
	let initialized = false;
	let retryDelay = 2000;
	const maxDelay = 8000;

	while (!initialized) {
		try {
			client = await connectMongoDB();
			if (!dbReady || !client) throw new Error('Database not ready');
			const db = client.db(dbName);

			setInterval(async () => {
				try {
					// console.log('Pinging MongoDB to check state...');
					// if (client) {
					// 	await safePing(client);
					// }
					if (client) {
						const status = await client
							.db('admin')
							.command({ replSetGetStatus: 1 });
						const unhealthy = status.members.some(
							(m: { health: number; stateStr: string }) =>
								m.health !== 1 ||
								m.stateStr === 'UNKNOWN' ||
								m.stateStr === 'DOWN'
						);
						if (unhealthy) {
							throw new Error('Replica set unhealthy');
						}
						console.log(
							'Replica set healthy:',
							status.members
								.map(
									(m: { name: any; stateStr: any }) =>
										`${m.name} (${m.stateStr})`
								)
								.join(', ')
						);
					}
				} catch (err) {
					dbReady = false;
					if (currentMode === 'replicaSet') {
						console.log(
							'Replica set unreachable or unhealthy, switching to direct connection mode.'
						);
						currentMode = 'direct';
						await connectMongoDB();
						if (client) {
							const db = client.db(dbName);
							setCellsCollection(db.collection('cells'));
							setAgentsCollection(db.collection('agents'));
						}
					}
				}

				if (currentMode === 'direct') {
					const isReplicaUp = await healthCheckReplicaSet();
					if (isReplicaUp) {
						console.log('Replica set is back, switching to replica set mode!');
						currentMode = 'replicaSet';
						await connectMongoDB();
						if (client) {
							const db = client.db(dbName);
							setCellsCollection(db.collection('cells'));
							setAgentsCollection(db.collection('agents'));
						}
					}
				}
			}, 4000);

			setCellsCollection(db.collection('cells'));
			setAgentsCollection(db.collection('agents'));

			const cellsCollection = db.collection('cells');
			const SIZE = process.env.SIZE ? Number(process.env.SIZE) : 20;
			const count = await cellsCollection.countDocuments();
			if (count === 0) {
				const bulk: Cell[] = [];
				for (let i = 0; i < SIZE; i++) {
					for (let j = 0; j < SIZE; j++) {
						bulk.push({ x: i, y: j, valeur: 0, agents: [] });
					}
				}
				await cellsCollection.insertMany(bulk);
				console.log(`Grille initialisée (${bulk.length} cases)`);
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

async function safePing(client: MongoClientType, timeout = 2000) {
	return Promise.race([
		client.db('admin').command({ ping: 1 }),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error('Ping timeout')), timeout)
		),
	]);
}

async function healthCheckReplicaSet() {
	try {
		const testClient = new MongoClient(replicaSetUri, {
			serverApi: { version: '1' },
		});
		await testClient.connect();
		const status = await testClient
			.db('admin')
			.command({ replSetGetStatus: 1 });
		await testClient.close();
		return status.members.every((m: { health: number }) => m.health === 1);
	} catch {
		return false;
	}
}

// if (!dbReady) {
// 	if (currentMode === 'replicaSet') {
// 		console.log('Trying to reconnect to MongoDB replica set...');
// 		await connectMongoDB();
// 		if (!dbReady) {
// 			console.log('Switching to direct connection mode.');
// 			currentMode = 'direct';
// 			await connectMongoDB();
// 		}
// 	} else {
// 		console.log(
// 			'Trying to reconnect to MongoDB replica set from direct mode...'
// 		);
// 		currentMode = 'replicaSet';
// 		await connectMongoDB();
// 		if (!dbReady) {
// 			console.log('Still offline, staying in direct connection mode.');
// 			currentMode = 'direct';
// 			await connectMongoDB();
// 		}
// 	}
// }
// Periodically attempt to reconnect if the DB is not ready

initDBAndStartServer().catch(console.dir);
