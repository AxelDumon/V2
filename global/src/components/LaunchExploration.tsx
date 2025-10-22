import React from 'react';

interface LaunchExplorationProps {
	selectedAgent: string | null;
}

const LaunchExploration: React.FC<LaunchExplorationProps> = ({
	selectedAgent,
}) => {
	// Function to launch exploration for all machines
	const launchForAll = async () => {
		try {
			const response = await fetch('/api/explore', {
				method: 'POST',
			});
			if (!response.ok) {
				throw new Error('Failed to launch exploration for all machines');
			}
			alert('Exploration launched for all machines!');
		} catch (error: any) {
			console.error(error.message);
			alert('Error launching exploration for all machines.');
		}
	};

	// Function to launch exploration for the selected machine
	const launchForSelected = async () => {
		if (!selectedAgent) {
			alert('No agent selected!');
			return;
		}
		try {
			const response = await fetch(`/api/explore/${selectedAgent}`, {
				method: 'POST',
			});
			if (!response.ok) {
				throw new Error(
					`Failed to launch exploration for agent: ${selectedAgent}`
				);
			}
			alert(`Exploration launched for agent: ${selectedAgent}`);
		} catch (error: any) {
			console.error(error.message);
			alert(`Error launching exploration for agent: ${selectedAgent}`);
		}
	};

	return (
		<div className="launch-exploration">
			<h3>Launch Exploration</h3>
			<div>
				<button onClick={launchForAll} className="btn btn-primary">
					Launch for All Machines
				</button>
				<button
					onClick={launchForSelected}
					className="btn btn-secondary"
					disabled={!selectedAgent}
				>
					Launch for Selected Machine
				</button>
			</div>
		</div>
	);
};

export default LaunchExploration;
