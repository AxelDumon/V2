import wss from "../../app.js";

export function broadcastUpdate(data: any) {
  console.log("[WebSocket] Broadcasting update:", data);
  data.type = "db_change";
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

export function onCellReserved(cell: any) {
  broadcastUpdate({ type: "cell_update", cell });
}

export function onAgentUpdate(stats: any) {
  broadcastUpdate({ type: "agent_stats_update", stats });
}
