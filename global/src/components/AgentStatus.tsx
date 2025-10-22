import React from 'react';
import { AgentStatusData } from '../types';

interface AgentStatusProps {
	agentStatus: AgentStatusData[];
}

const AgentStatus: React.FC<AgentStatusProps> = ({ agentStatus }) => {
	return (
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
	);
};

export default AgentStatus;
