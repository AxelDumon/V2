import { Agent } from "../../Agent.js";
import { BaseRepository } from "./BaseRepository.js";

export interface AgentRepository extends BaseRepository<Agent> {
  // getAgentStats(): Promise<any>;
  // getAgentStatsWithDuration(): Promise<any>;
  updateExploringTime(isTheStart: boolean): Promise<void>;
}
