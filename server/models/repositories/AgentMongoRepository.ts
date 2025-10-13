import { Agent } from "../Agent.js";
import { BasicMongoRepository } from "./BasicMongoRepository.js";
import { AgentRepository } from "./interfaces/AgentRepository.js";

export class AgentMongoRepository
  extends BasicMongoRepository<Agent>
  implements AgentRepository
{
  async updateExploringTime(isTheStart: boolean): Promise<void> {
    await this.collection.findOneAndUpdate(
      {},
      isTheStart
        ? { $set: { startTime: new Date() } }
        : { $set: { endTime: new Date() } },
      { returnDocument: "after", includeResultMetadata: true }
    );
  }
}
