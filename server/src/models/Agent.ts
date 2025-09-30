import { CouchDB } from '../utils/CouchDB.js';
import { AgentDocument, AllDocs } from '../utils/types.js';

export default class Agent {
	static agentName: string = process.env.AGENT_NAME || 'Agent';
	static designDocId: string = 'agent_views';

	static async getAgentStats() {
		try {
			const res = await fetch(
				CouchDB.dbUrl + '/_design/agent_views/_view/count_by_agent?group=true',
				{
					headers: { Authorization: CouchDB.authHeader },
				}
			);
			const data: AllDocs = await res.json();
			return data.rows.map(row => ({
				name: row.key,
				count: row.value,
			}));
		} catch (error) {
			console.error('Error fetching agent stats:', error);
			throw error;
		}
	}

	static async getAgentStatsWithDuration() {
		try {
			const stats = await Agent.getAgentStats();
			const agents: AllDocs = await fetch(
				`${CouchDB.dbUrl}/_all_docs?include_docs=true`,
				{
					headers: { Authorization: CouchDB.authHeader },
				}
			).then(res => res.json());

			const agentsData: AgentDocument[] = agents.rows
				.map(row => row.doc)
				.filter(
					(doc): doc is AgentDocument => doc !== undefined && 'name' in doc
				);

			return stats.map(stat => {
				const agent = agentsData.find(a => a.name === stat.name);
				let duration = null;
				if (agent?.startTime && agent?.endTime) {
					duration =
						(new Date(agent.endTime).getTime() -
							new Date(agent.startTime).getTime()) /
						1000;
				}
				return { ...stat, duration };
			});
		} catch (error) {
			console.error('Error fetching agent stats with duration:', error);
			throw error;
		}
	}

	static async updateExploringTime(isStart: boolean = true) {
		try {
			// const url = `${CouchDB.dbUrl}/_design/agent_views/_view/by_name`;
			const queryResult = await CouchDB.findView(
				Agent.designDocId,
				'by_name',
				{ include_docs: 'true' },
				[Agent.agentName]
			);
			if (
				queryResult.total_rows > 0 &&
				queryResult.rows[0] &&
				queryResult.rows[0].doc != undefined
			) {
				const agentDoc = queryResult.rows[0].doc as AgentDocument;
				if (isStart) agentDoc.startTime = new Date().toISOString();
				else agentDoc.endTime = new Date().toISOString();

				return await CouchDB.updateDocument(agentDoc);
			} else {
				console.warn(
					`Agent document not found for name: ${Agent.agentName}. Creating a new document.`
				);
				const newAgent: AgentDocument = {
					_id: `${Agent.agentName}`,
					type: 'agent',
					name: Agent.agentName,
					startTime: isStart ? new Date().toISOString() : undefined,
					endTime: !isStart ? new Date().toISOString() : undefined,
				};
				return await CouchDB.createDocument(newAgent);
			}
		} catch (error) {
			console.error('Error updating start time:', error);
		}
	}
}
