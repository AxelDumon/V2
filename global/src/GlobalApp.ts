import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
const BACKEND_SERVICES = (process.env.BACKEND_SERVICES || '').split(',');

let explorationStartTime: Date | null = null;

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the React app's static files
const buildPath = path.join(__dirname, '../build');
app.use(express.static(buildPath));

// Endpoint to start exploration and set the timer
app.post('/api/explore', async (_req, res) => {
	try {
		explorationStartTime = new Date(); // Set the exploration start time
		await Promise.all(
			BACKEND_SERVICES.map(service =>
				fetch(`http://${service}/api/explore`, { method: 'POST' })
			)
		);
		res.json('Exploration started successfully');
	} catch (error: Error | any) {
		console.error('Error starting exploration:', error.message);
		res.status(500).json({ error: 'Failed to start exploration' });
	}
});

// Endpoint to get the exploration timer
app.get('/api/exploration-timer', (_req, res) => {
	if (!explorationStartTime) {
		return res.json({ started: false });
	}
	const elapsed = new Date().getTime() - explorationStartTime.getTime();
	res.json({ started: true, elapsed });
});

// Endpoint to get agent statuses
app.get('/api/agent-status', async (_req, res) => {
	try {
		const statuses = await Promise.all(
			BACKEND_SERVICES.map(async service => {
				try {
					const response = await fetch(`http://${service}/api/status`);
					const data = await response.json();
					return { service, ...data, online: true };
				} catch {
					return { service, online: false };
				}
			})
		);
		res.json(statuses);
	} catch (error: Error | any) {
		console.error('Error fetching agent statuses:', error.message);
		res.status(500).json({ error: 'Failed to fetch agent statuses' });
	}
});

app.get(/^\/(?!api).*/, (_req, res) => {
	res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Global frontend running on http://localhost:${PORT}`);
});

// app.get('/api/agents', async (_req, res) => {
// 	try {
// 		const results = await Promise.all(
// 			BACKEND_SERVICES.map(service => fetch(`http://${service}/api/agents`))
// 		);
// 		const allAgents = results.flatMap(result => result.json());
// 		res.json(allAgents);
// 	} catch (error: Error | any) {
// 		console.error('Error fetching agents:', error.message);
// 		res.status(500).json({ error: 'Failed to fetch agents' });
// 	}
// });

// app.get('/api/cells', async (_req, res) => {
// 	try {
// 		const results = await Promise.all(
// 			BACKEND_SERVICES.map(service => fetch(`http://${service}/api/cells`))
// 		);
// 		const allCells = results.flatMap(result => result.json());
// 		res.json(allCells);
// 	} catch (error: Error | any) {
// 		console.error('Error fetching cells:', error.message);
// 		res.status(500).json({ error: 'Failed to fetch cells' });
// 	}
// });

// app.post('/api/explore', async (_req, res) => {
// 	try {
// 		Promise.all(
// 			BACKEND_SERVICES.map(service =>
// 				fetch(`http://${service}/api/explore`, { method: 'POST' })
// 			)
// 		);
// 		// const allExploreData = results.flatMap((result) => result.json());
// 		res.json('Exploration lancé avec succès');
// 	} catch (error: Error | any) {
// 		console.error('Error fetching explore data:', error.message);
// 		res.status(500).json({ error: 'Failed to fetch explore data' });
// 	}
// });
