import { Agent } from '../Agent';
import { BasicMongoRepository } from './BasicMongoRepository';
import { AgentRepository } from './interfaces/AgentRepository';

export class AgentMongoRepository
	extends BasicMongoRepository<Agent>
	implements AgentRepository
{
	getAgentStats(): Promise<any> {
		throw new Error('Method not implemented.');
	}
	getAgentStatsWithDuration(): Promise<any> {
		throw new Error('Method not implemented.');
	}
	updateExploringTime(isTheStart: boolean): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
