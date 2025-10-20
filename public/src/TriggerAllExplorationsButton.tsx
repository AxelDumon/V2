export default function TriggerAllExplorationsButton() {
	return (
		<button
			className="btn btn-success"
			onClick={async () => {
				await triggerExplorationForAllAgents();
			}}
		>
			Trigger Exploration for All Agents
		</button>
	);
}

async function triggerExplorationForAllAgents() {
	console.log(
		'[triggerExplorationForAllAgents] Starting exploration for all agents...'
	);

	const NUM_MACHINES = Number(import.meta.env.VITE_NUM_MACHINES) || 5;
	const BASE_PORT = Number(import.meta.env.VITE_BASE_PORT) || 3000;
	const BASE_IP = '10.89.2.';

	const appUrls = [];
	for (let i = 1; i <= NUM_MACHINES; i++) {
		const ip = BASE_IP + (10 + i);
		const port = BASE_PORT + i;
		appUrls.push(`http://${ip}:${port}/api/explore`);
	}

	console.log(
		`[triggerExplorationForAllAgents] Generated app URLs: ${appUrls.join(', ')}`
	);

	for (const url of appUrls) {
		try {
			console.log(`[triggerExplorationForAllAgents] Sending request to ${url}`);
			const response = await fetch(url, { method: 'POST' });
			console.log(
				`[triggerExplorationForAllAgents] Response from ${url}:`,
				await response.json()
			);
		} catch (error: any) {
			console.error(
				`[triggerExplorationForAllAgents] Failed to call ${url}:`,
				error.message
			);
		}
	}

	console.log(
		'[triggerExplorationForAllAgents] Exploration triggered for all agents.'
	);
}
