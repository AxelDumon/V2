import { AgentRepository } from "../../repositories/interfaces/AgentRepository.js";
import { CellRepository } from "../../repositories/interfaces/CellRepository.js";
import { SimulationProps } from "../../utils/types.js";

export abstract class BaseManager {
  abstract cellRepository: CellRepository;
  abstract agentRepository: AgentRepository;

  // Common manager methods can be defined here
  abstract initBase(): Promise<number>;
  abstract getCellRepository(): CellRepository;
  abstract getAgentRepository(): AgentRepository;
  abstract ManagerFactory(): Promise<BaseManager>;

  // Methods that need and the cellRepository and agentRepository
  abstract getAgentStats(): Promise<any>;
  abstract getSimulationStats(): Promise<SimulationProps>;
}
