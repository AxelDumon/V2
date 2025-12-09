import { useEffect, useState, useRef } from 'react';
import Grid from './Grid';
import { AgentStat } from './type';
import TriggerAllExplorationsButton from './TriggerAllExplorationsButton';

const SIZE = Number(import.meta.env.VITE_SIZE);
// const DELAY = Number(import.meta.env.VITE_DELAY);
const PORT = import.meta.env.VITE_BASE_PORT || 3000;
console.log('PORT:', PORT);
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = 'http://localhost:' + PORT;
const WS_URL = 'ws://localhost:' + (import.meta.env.VITE_BASE_WS_PORT || 4860);

export default function App() {
	const [tab, setTab] = useState<any[][]>(() =>
		Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
	);
	const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
	// const [exploring, setExploring] = useState(false);
	const intervalRef = useRef<number | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);

	async function fetchAgentStats() {
		const res = await fetch(`${API_URL}/api/agents`);
		const stats = await res.json();
		setAgentStats(stats);
	}

	async function fetchCells() {
		const res = await fetch(`${API_URL}/api/cells`);
		const cells = await res.json();
		setTab(prevTab => {
			const newTab = prevTab.map(row => row.slice());
			cells.forEach((cell: any) => {
				const x = 'x' in cell ? cell.x : cell._id?.split('-')[0];
				const y = cell.y || cell._id.split('-')[1];
				newTab[x][y] = {
					valeur: cell.valeur || 0,
					agents: cell.agents || [],
				};
			});
			return newTab;
		});
	}

	async function triggerExploration() {
		// setExploring(true);
		console.log('Triggering exploration...');
		await fetch(`${API_URL}/api/explore`, { method: 'POST' });
		await fetchCells();
		await fetchAgentStats();
		// if (!intervalRef.current) {
		// 	intervalRef.current = window.setInterval(async () => {
		// 		await fetchCells();
		// 		await fetchAgentStats();
		// 		if (tab.flat().filter(c => c === 0).length === 0) {
		// 			// setExploring(false);
		// 			clearInterval(intervalRef.current!);
		// 			intervalRef.current = null;
		// 		}
		// 	}, DELAY);
		// }
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

	function connectWebSocket() {
		if (wsRef.current !== null) {
			wsRef.current.close();
		}

		const ws = new WebSocket(WS_URL);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log('Connected to WebSocket server');
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
		};

		ws.onmessage = event => {
			const message: any = JSON.parse(event.data);

			if (message.type === 'db_change') {
				console.log('Database change detected:', message);

				if (message && message.agents != undefined) {
					const x = 'x' in message ? message.x : message._id?.split('-')[0];
					const y = message.y || message._id?.split('-')[1];
					setTab(prevTab => {
						const newTab = prevTab.map(row => row.slice());
						newTab[x][y] = {
							valeur: message.valeur || 0,
							agents: message.agents || [],
						};
						return newTab;
					});
				}
			}
			if (message.type === 'agent') fetchAgentStats();
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
			// Attempt to reconnect after a delay
			reconnectTimeoutRef.current = window.setTimeout(() => {
				console.log('Reconnecting to WebSocket server...');
				connectWebSocket();
			}, 2000); // Reconnect after 2 seconds
		};

		ws.onerror = error => {
			console.error('WebSocket error:', error);
			ws.close(); // Ensure the connection is closed on error
		};
	}

	useEffect(() => {
		// Connect to the WebSocket server
		connectWebSocket();

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		fetchAgentStats();
		fetchCells();
		// intervalRef.current = window.setInterval(async () => {
		// 	await fetchCells();
		// 	await fetchAgentStats();
		// }, DELAY);
		// return () => {
		// 	if (intervalRef.current) {
		// 		clearInterval(intervalRef.current);
		// 	}
		// };
	}, []);

	return (
		<div
			className="container py-4"
			style={{ backgroundColor: '#212529', minHeight: '100vh' }}
		>
			<div className="mb-3 d-flex flex-row gap-2 justify-content-center">
				<TriggerAllExplorationsButton />
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
							Agent {agent.name || agent._id} : {agent.tilesExplored ? `${agent.tilesExplored} cases` : '0 cases'}
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
