import { useEffect, useState, useRef } from 'react';
import Grid from './Grid';
import { AgentStat } from '../type';

const SIZE = Number(import.meta.env.VITE_SIZE);
// const DELAY = Number(import.meta.env.VITE_DELAY);
const PORT = import.meta.env.VITE_PORT || 3001;
console.log('PORT:', PORT);
const API_URL = 'http://localhost:' + PORT;
const WS_URL = 'ws://localhost:808' + PORT.toString().charAt(3);

export default function App() {
	const [tab, setTab] = useState<any[][]>(() =>
		Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
	);
	const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
	// const [exploring, setExploring] = useState(false);
	const intervalRef = useRef<number | null>(null);

	async function fetchAgentStats() {
		const res = await fetch(`${API_URL}/api/agents`);
		const stats = await res.json();
		setAgentStats(stats);
	}

	async function fetchCells() {
		const res = await fetch(`${API_URL}/api/cells`);
		const cells = await res.json();
		const newTab = Array.from({ length: SIZE }, () =>
			Array(SIZE).fill({ valeur: 0, agents: [] })
		);
		cells.forEach((cell: any) => {
			newTab[cell.x][cell.y] = {
				valeur: cell.valeur || 0,
				agents: cell.agents || [],
			};
		});
		setTab(newTab);
	}

	// async function startFetchingDate() {
	// 	if (!intervalRef.current) {
	// 		intervalRef.current = window.setInterval(async () => {
	// 			await fetchCells();
	// 			await fetchAgentStats();
	// 			// Check if all cells are explored
	// 			if (tab.flat().filter(c => c === 0).length === 0) {
	// 				clearInterval(intervalRef.current!);
	// 				intervalRef.current = null;
	// 			}
	// 		}, DELAY);
	// 	}
	// }

	async function triggerExploration() {
		// setExploring(true);
		await fetch(`${API_URL}/api/explore`, { method: 'POST' });
		await fetchCells();
		await fetchAgentStats();
		// startFetchingDate();
	}

	async function clearGrid() {
		await fetch(`${API_URL}/api/init`, { method: 'POST' });
		setTab(Array.from({ length: SIZE }, () => Array(SIZE).fill(0)));
		// setExploring(false);
		setAgentStats([]);
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}

	useEffect(() => {
		// Connect to the WebSocket server
		const ws = new WebSocket(WS_URL);

		ws.onopen = () => {
			console.log('Connected to WebSocket server');
		};

		ws.onmessage = event => {
			const message: {
				type: string;
				data: any;
			} = JSON.parse(event.data);
			console.log('WebSocket message received:', message);

			if (message.type === 'db_change') {
				const change = message.data;
				console.log('Database change detected:', change);

				if (change.doc && change.doc.type === 'cell')
					setTab(prevTab => {
						const newTab = prevTab.map(row => row.slice());
						newTab[change.doc.x][change.doc.y] = {
							valeur: change.doc.valeur || 0,
							agents: change.doc.agents || [],
						};
						return newTab;
					});

				if (change.doc && change.doc.type === 'agent') fetchAgentStats();
			}
			// if (message.type == 'cell_update') {
			// 	const cell = message.data;
			// 	setTab(prevTab => {
			// 		const newTab = prevTab.map(row => row.slice());
			// 		newTab[cell.x][cell.y] = {
			// 			valeur: cell.valeur || 0,
			// 			agents: cell.agents || [],
			// 		};
			// 		return newTab;
			// 	});
			// } else if (message.type == 'agent_stats_update') {
			// 	console.log('Agent stats update received:', message.data);
			// 	setAgentStats(message.data);
			// } else if (message.type === 'replication_update') {
			// 	console.log('Replication update received:', message.data);
			// 	// Optionally, handle replication updates (e.g., refresh the grid or stats)
			// 	fetchCells();
			// 	fetchAgentStats();
			// }
		};

		ws.onclose = () => {
			console.log('Disconnected from WebSocket server');
		};

		return () => {
			ws.close();
		};
		// fetchAgentStats();
		// fetchCells();
		// startFetchingDate();
		// return () => {
		// 	if (intervalRef.current) {
		// 		clearInterval(intervalRef.current);
		// 	}
		// };
	}, []);

	useEffect(() => {
		console.log('Tab state updated:', tab);
	}, [tab]);

	useEffect(() => {
		fetchCells();
		fetchAgentStats();
	}, []);

	return (
		<div
			className="container py-4"
			style={{ backgroundColor: '#212529', minHeight: '100vh' }}
		>
			<div className="mb-3 d-flex flex-row gap-2 justify-content-center">
				<button className="btn btn-primary" onClick={triggerExploration}>
					Explorer
				</button>
				<button className="btn btn-danger" onClick={clearGrid}>
					Vider la grille
				</button>
			</div>
			<div className="mb-3">
				<h5 className="text-white text-center">Cases parcourues par agent :</h5>
				<ul>
					{agentStats.map(agent => (
						<li className="text-white border" key={agent.name || agent._id}>
							Agent {agent.name || agent._id} : {agent.count} cases
							{agent.duration != null && (
								<> — Temps : {agent.duration.toFixed(2)} s</>
							)}
						</li>
					))}
				</ul>
			</div>
			<div className="mb-3 text-center">
				<span className="badge bg-white text-dark">
					Cases inexplorées restantes :{' '}
					{SIZE ** 2 -
						tab
							.map(row => row.filter(cell => cell.valeur > 0).length)
							.reduce((a, b) => a + b, 0)}
				</span>
			</div>
			<div className="border rounded p-3 bg-light">
				<Grid cellSize={20} tab={tab} />
			</div>
		</div>
	);
}
