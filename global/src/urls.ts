export const URLS = {
	AGENT_STATUS: '/api/agent-status',
	EXPLORATION_TIMER: '/api/exploration-timer',
	AGENT_GRID: (agent: string) => `/api/agents/${agent}`,
	EXPLORE: '/api/explore',
};
