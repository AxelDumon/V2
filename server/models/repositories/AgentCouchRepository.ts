import { agent } from "../../app.js";
import { Agent } from "../Agent.js";
import { AgentDocument } from "../utils/couchTypes.js";
import { BasicCouchRepository } from "./BasicCouchRepository.js";
import { AgentRepository } from "./interfaces/AgentRepository.js";

export class AgentCouchRepository
  extends BasicCouchRepository<AgentDocument>
  implements AgentRepository
{
  static designDocId: string = "agent_views";
  updateExploringTime(isTheStart: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async updateExploringTime(isStart: boolean = true) {
    try {
      // const url = `${CouchDB.dbUrl}/_design/agent_views/_view/by_name`;
      const queryResult = await CouchDB.findView(
        AgentCouchRepository.designDocId,
        "by_name",
        { include_docs: "true" },
        [agent.name]
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
          `Agent document not found for name: ${agent.name}. Creating a new document.`
        );
        const newAgent: AgentDocument = {
          _id: `${agent.name}`,
          type: "agent",
          name: agent.name,
          startTime: isStart ? new Date().toISOString() : undefined,
          endTime: !isStart ? new Date().toISOString() : undefined,
        };
        return await this.create(newAgent);
      }
    } catch (error) {
      console.error("Error updating start time:", error);
    }
  }

  deleteAll(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  count(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  findAll(): Promise<Agent[]> {
    throw new Error("Method not implemented.");
  }
  create(item: Agent): Promise<Agent> {
    throw new Error("Method not implemented.");
  }
  update(id: string, item: Partial<Agent>): Promise<Agent | null> {
    throw new Error("Method not implemented.");
  }
  deleteById(id: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}
