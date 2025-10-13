import { Agent } from "../Agent.js";
import { BasicMongoRepository } from "./BasicMongoRepository.js";
import { AgentRepository } from "./interfaces/AgentRepository.js";

export class AgentMongoRepository
  extends BasicMongoRepository<Agent>
  implements AgentRepository
{
  getAgentStats(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  getAgentStatsWithDuration(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async updateExploringTime(isTheStart: boolean): Promise<void> {
    await this.collection.findOneAndUpdate(
      {},
      isTheStart
        ? { $set: { startedAt: new Date() } }
        : { $set: { endedAt: new Date() } },
      { returnDocument: "after", includeResultMetadata: true }
    );
  }
}
