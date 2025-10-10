import { AgentRepository } from "../../repositories/interfaces/AgentRepository";
import { CellRepository } from "../../repositories/interfaces/CellRepository";

export abstract class BaseManager {
  abstract cellRepository: CellRepository;
  abstract agentRepository: AgentRepository;

  // Common manager methods can be defined here
  abstract initBase(): Promise<void>;
  abstract getCellRepository(): CellRepository;
  abstract getAgentRepository(): AgentRepository;
  abstract ManagerFactory(): Promise<BaseManager>;
}
