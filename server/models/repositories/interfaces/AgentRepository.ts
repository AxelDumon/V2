import { Agent } from '../../Agent';
import { BaseRepository } from './BaseRepository';

export interface AgentRepository extends BaseRepository<Agent> {
	getAgentStats(): Promise<any>;
	getAgentStatsWithDuration(): Promise<any>;
	updateExploringTime(isTheStart: boolean): Promise<void>;
}
