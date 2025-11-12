import { Agent } from "../../Agent.js";
import { BaseRepository } from "./BaseRepository.js";

export interface AgentRepository extends BaseRepository<Agent> {
  updateExploringTime(isTheStart: boolean): Promise<void>;
}
