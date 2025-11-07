import React, { useEffect, useState } from 'react';
import Grid from '../components/Grid';
import AgentsTab from '../components/AgentsTab';
import AgentStatus from '../components/AgentStatus';
import Timer from '../components/Timer';
import { AgentStatusData, CellData } from '../types';
import {
	fetchAgentStatus,
	fetchExplorationTimer,
	fetchGrid,
} from '../utils/api';
import LaunchExploration from '../components/LaunchExploration';
import ErrorBoundary from '../components/ErrorBoundary';

const Dashboard: React.FC = () => {
	const SIZE = parseInt(import.meta.env.VITE_SIZE) || 50;
	const [agents, setAgents] = useState<string[]>([]);
	const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
	const [grid, setGrid] = useState<CellData[][]>(() =>
		Array.from({ length: SIZE }, () =>
			Array(SIZE).fill({ valeur: 0, agents: [] })
		)
	);
	const [agentStatus, setAgentStatus] = useState<AgentStatusData[]>([]);
	const [explorationTime, setExplorationTime] = useState<number>(0);

	// Fetch agent statuses
	useEffect(() => {
		const UpdateAgentStatus = async () => {
			const data = await fetchAgentStatus();
			setAgentStatus(data);
			setAgents(data.map((status: any) => status.name));
			if (!selectedAgent && data.length > 0) {
				setSelectedAgent(data[0].name);
			}
		};
		UpdateAgentStatus();
		const interval = setInterval(UpdateAgentStatus, 1000); // Update every second
		return () => clearInterval(interval);
	}, [selectedAgent]);

	// Fetch exploration timer
	useEffect(() => {
		const updateExplorationTimer = async () => {
			const data = await fetchExplorationTimer();
			if (data.started) {
				setExplorationTime(data.elapsed);
			}
		};
		updateExplorationTimer();
		const interval = setInterval(updateExplorationTimer, 1000); // Update every second
		return () => clearInterval(interval);
	}, []);

	// Fetch grid data for the selected agent
	useEffect(() => {
		if (!selectedAgent) return;
		const updateGrid = async () => {
			const data = await fetchGrid(selectedAgent);
			console.log('Fetched grid data:', data);
			if (!data.grid || !Array.isArray(data.grid)) {
				console.error('Invalid grid data:', data.grid);
				return;
			}
			setGrid(data.grid);
		};
		updateGrid();
	}, [selectedAgent]);

	return (
		<div className="App">
			<h1>Global Exploration Dashboard</h1>
			<Timer explorationTime={explorationTime} />
			<LaunchExploration selectedAgent={selectedAgent} />
			<AgentsTab
				agents={agents}
				selectedAgent={selectedAgent}
				onSelectAgent={setSelectedAgent}
			/>
			<div className="border rounded p-3 bg-light">
				<ErrorBoundary>
					<Grid cellSize={800 / SIZE} tab={grid} />
				</ErrorBoundary>
			</div>
			<AgentStatus agentStatus={agentStatus} />
		</div>
	);
};

export default Dashboard;
