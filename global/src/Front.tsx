import React, { useEffect, useState } from 'react';
// import "./App.css";

const GlobalApp: React.FC = () => {
	const [agents, setAgents] = useState<string[]>([]);
	const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
	const [grid, setGrid] = useState<number[][]>([]);
	const [agentStatus, setAgentStatus] = useState<any[]>([]);
	const [explorationTime, setExplorationTime] = useState<number>(0);

	// Fetch agent statuses
	useEffect(() => {
		const fetchAgentStatus = async () => {
			const response = await fetch('/api/agent-status');
			const data = await response.json();
			setAgentStatus(previousStatus => {
				return data.map((status: any) => {
					const previous = previousStatus.find(
						(s: any) => s.service === status.service
					);
					return {
						...status,
						lastSeen: status.online
							? status.lastSeen
							: previous
								? previous.lastSeen
								: Date.now(),
						name: previous && previous.name ? previous.name : status.name,
					};
				});
			});
			setAgents(previousAgents => {
				const agentNames = data.map((status: any) => status.name);
				return Array.from(
					new Set([
						...previousAgents.filter(
							agent => agent != undefined && !agent.includes('Agent')
						),
						...agentNames,
					])
				);
			});
			if (!selectedAgent && data.length > 0) {
				setSelectedAgent(data[0].name);
			}
		};
		fetchAgentStatus();
		const interval = setInterval(fetchAgentStatus, 1000); // Update every second
		return () => clearInterval(interval);
	}, [selectedAgent]);

	// Fetch exploration timer
	useEffect(() => {
		const fetchExplorationTimer = async () => {
			const response = await fetch('/api/exploration-timer');
			const data = await response.json();
			if (data.started) {
				setExplorationTime(data.elapsed);
			}
		};
		fetchExplorationTimer();
		const interval = setInterval(fetchExplorationTimer, 1000); // Update every second
		return () => clearInterval(interval);
	}, []);

	// Fetch grid data for the selected agent
	useEffect(() => {
		if (!selectedAgent) return;
		const fetchGrid = async () => {
			const response = await fetch(`/api/agents/${selectedAgent}`);
			const data = await response.json();
			setGrid(data.grid);
		};
		fetchGrid();
	}, [selectedAgent]);

	return (
		<div className="App">
			<h1>Global Exploration Dashboard</h1>
			<div>
				<h2>Exploration Timer: {Math.floor(explorationTime / 1000)} seconds</h2>
			</div>
			<div className="tabs">
				{agents.map(agent => (
					<button
						key={agent}
						className={agent === selectedAgent ? 'active' : ''}
						onClick={() => setSelectedAgent(agent)}
					>
						{agent}
					</button>
				))}
			</div>
			<div className="grid">
				{grid.map((row, rowIndex) => (
					<div key={rowIndex} className="grid-row">
						{row.map((cell, cellIndex) => (
							<div
								key={cellIndex}
								className="grid-cell"
								style={{ backgroundColor: `rgba(0, 0, 255, ${cell / 10})` }}
							>
								{cell}
							</div>
						))}
					</div>
				))}
			</div>
			<div className="agent-status">
				<h2>Agent Status</h2>
				{agentStatus.map(status => (
					<div key={status.service}>
						<p>
							{status.name}: {status.online ? 'Online' : 'Offline'}{' '}
							{status.online
								? ''
								: `(Last seen: ${new Date(status.lastSeen).toLocaleString()})`}
						</p>
					</div>
				))}
			</div>
		</div>
	);
};

export default GlobalApp;
