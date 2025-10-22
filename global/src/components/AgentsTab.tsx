import React from 'react';

interface AgentTabsProps {
	agents: string[];
	selectedAgent: string | null;
	onSelectAgent: (agent: string) => void;
}

const AgentTabs: React.FC<AgentTabsProps> = ({
	agents,
	selectedAgent,
	onSelectAgent,
}) => {
	return (
		<div className="tabs">
			{agents.map(agent => (
				<button
					key={agent}
					className={agent === selectedAgent ? 'active' : ''}
					onClick={() => onSelectAgent(agent)}
				>
					{agent}
				</button>
			))}
		</div>
	);
};

export default AgentTabs;
