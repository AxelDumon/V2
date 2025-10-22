const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const fetchAgentStatus = async () => {
	const response = await fetch(`${API_BASE_URL}/api/agent-status`);
	if (!response.ok) {
		throw new Error(`Failed to fetch agent status`);
	}
	return response.json();
};

export const fetchExplorationTimer = async () => {
	const response = await fetch(`${API_BASE_URL}/api/exploration-timer`);
	if (!response.ok) {
		throw new Error(`Failed to fetch exploration timer`);
	}
	return response.json();
};

export const fetchGrid = async (agent: string) => {
	const response = await fetch(`${API_BASE_URL}/api/agents/${agent}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch grid for agent: ${agent}`);
	}
	return response.json();
};
