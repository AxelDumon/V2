import wss from '../app.js';

// Broadcast a message to all connected clients
export function broadcastUpdate(data: any) {
	console.log('[WebSocket] Broadcasting update:', data);
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

// Example: Push updates when replication occurs
export function onReplicationUpdate(replicationInfo: any) {
	console.log('[WebSocket] Sending replication update:', replicationInfo);
	broadcastUpdate({ type: 'replication_update', data: replicationInfo });
}
