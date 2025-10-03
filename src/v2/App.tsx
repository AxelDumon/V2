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
				newTab[cell.x][cell.y] = {
					valeur: cell.valeur || 0,
					agents: cell.agents || [],
				};
			});
			return newTab;
		});
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

	async function triggerExplorationForAllMachines() {
		try {
			// Fetch the list of peers from the environment variable
			const peers = import.meta.env.VITE_AGENT_PEERS?.split(',') || [];
			console.log('Triggering exploration for peers:', peers);

			// Send a POST request to each peer
			const requests = peers.map((peer: string) => {
				const peerPort = `300${peer.charAt(peer.length - 1)}`; // Assuming the port is the last character (e.g., machine1 -> 1
				console.log(
					`Sending request to http://${peer}:${peerPort}/api/explore`
				);
				fetch(`http://${peer}:${peerPort}/api/explore`, {
					method: 'POST',
				}).then(res => {
					if (!res.ok) {
						console.error(
							`Failed to trigger exploration on peer ${peer}:`,
							res.statusText
						);
					} else {
						console.log(`Exploration triggered on peer ${peer}`);
					}
				});
			});

			// Wait for all requests to complete
			await Promise.all(requests);
			await triggerExploration();

			console.log('Exploration triggered for all peers');
		} catch (error) {
			console.error('Error triggering exploration for all machines:', error);
		}
	}

	async function clearGrid() {
		await fetch(`${API_URL}/api/init`, { method: 'POST' });
		setTab(Array.from({ length: SIZE }, () => Array(SIZE).fill(0)));
		// setExploring(false);
		setAgentStats([]);
		fetchCells();
		fetchAgentStats();
		// Stop the interval if it's running
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}

	function connectWebSocket() {
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

	// useEffect(() => {
	// 	console.log('Tab state updated:', tab);
	// }, [tab]);

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
				<button
					className="btn btn-success"
					onClick={triggerExplorationForAllMachines}
				>
					Explorer (All Machines)
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
