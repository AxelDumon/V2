import { ReturnDocument } from "mongodb";
import { Agent } from "../Agent.js";
import { BasicMongoRepository } from "./BasicMongoRepository.js";
import { AgentRepository } from "./interfaces/AgentRepository.js";
import { agent } from "../../app.js";

export class AgentMongoRepository
  extends BasicMongoRepository<Agent>
  implements AgentRepository
{
  async updateExploringTime(isTheStart: boolean): Promise<void> {
    const filter = { _id: agent.name };
    const update = isTheStart
      ? { $set: { startTime: new Date(), _id: agent.name } }
      : { $set: { endTime: new Date() } };
    const options = {
      returnDocument: ReturnDocument.AFTER,
      includeResultMetadata: true,
      upsert: true,
    };
    console.log(
      `[updateExploringTime] Updating exploring time for agent ${Agent.name}, isTheStart: ${isTheStart}`
    );
    console.log(`[updateExploringTime] Filter: ${JSON.stringify(filter)}`);
    console.log(`[updateExploringTime] Update: ${JSON.stringify(update)}`);
    console.log(`[updateExploringTime] Options: ${JSON.stringify(options)}`);
    const result = await this.collection.findOneAndUpdate(
      filter,
      update,
      options
    );
    console.log(
      `[updateExploringTime] Agent exploring time updated: ${result}`
    );
  }
}
