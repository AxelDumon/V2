import wss from '../app.js';

// Broadcast a message to all connected clients
export function broadcastUpdate(data: any) {
	wss.clients.forEach(client => {
		if (client.readyState === 1) {
			// WebSocket.OPEN
			client.send(JSON.stringify(data));
		}
	});
}

// Example: Push updates when a cell is reserved
export function onCellReserved(cell: any) {
	broadcastUpdate({ type: 'cell_update', data: cell });
}

// Example: Push updates when agent stats change
export function onAgentStatsUpdated(stats: any) {
	broadcastUpdate({ type: 'agent_stats_update', data: stats });
}
