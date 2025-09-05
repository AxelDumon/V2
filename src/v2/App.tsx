import { useEffect, useState, useRef } from 'react';
import Grid from './Grid';
import { AgentStat } from '../type';

const SIZE = Number(import.meta.env.VITE_SIZE);
const DELAY = Number(import.meta.env.VITE_DELAY);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

	async function triggerExploration() {
		// setExploring(true);
		await fetch(`${API_URL}/api/explore`, { method: 'POST' });
		if (!intervalRef.current) {
			intervalRef.current = window.setInterval(async () => {
				await fetchCells();
				await fetchAgentStats();
				if (tab.flat().filter(c => c === 0).length === 0) {
					// setExploring(false);
					clearInterval(intervalRef.current!);
					intervalRef.current = null;
				}
			}, DELAY);
		}
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
		fetchAgentStats();
		fetchCells();
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
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
						<li className="text-white border" key={agent._id}>
							Agent {agent._id} : {agent.count} cases
						</li>
					))}
				</ul>
			</div>
			<div className="mb-3 text-center">
				<span className="badge bg-white text-dark">
					Cases inexplorées restantes :{' '}
					{SIZE ** 2 -
						agentStats
							.map(agent => Number(agent.count))
							.reduce((a, b) => a + b, 0)}
				</span>
			</div>
			<div className="border rounded p-3 bg-light">
				<Grid cellSize={20} tab={tab} />
			</div>
		</div>
	);
}
