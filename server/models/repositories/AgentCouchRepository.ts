import { agent } from "../../app.js";
import { CouchManager } from "../BaseManager/CouchManager.js";
import { AgentDocument } from "../utils/couchTypes.js";
import { BasicCouchRepository } from "./BasicCouchRepository.js";
import { AgentRepository } from "./interfaces/AgentRepository.js";

export class AgentCouchRepository
  extends BasicCouchRepository<AgentDocument>
  implements AgentRepository
{
  constructor(baseManager: CouchManager) {
    super(baseManager);
  }

  static designDocId: string = "agent_views";

  async findByName(name: string): Promise<AgentDocument | null> {
    try {
      const queryResult = await CouchManager.findView(
        AgentCouchRepository.designDocId,
        "by_name",
        { include_docs: "true" },
        [name]
      );
      if (
        queryResult.total_rows > 0 &&
        queryResult.rows[0] &&
        queryResult.rows[0].doc != undefined
      ) {
        return queryResult.rows[0].doc as AgentDocument;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error finding agent by name ${name}:`, error);
      return null;
    }
  }

  async update(
    id: string,
    item: Partial<AgentDocument>
  ): Promise<AgentDocument | null> {
    try {
      const existingDoc = await this.findByName(id);
      if (!existingDoc) {
        console.warn(`Agent document with id ${id} not found for update.`);
        console.log("Creating new document instead.");
        const newDoc: AgentDocument = {
          _id: id,
          type: "agent",
          name: item.name || id,
          startTime: item.startTime || undefined,
          endTime: item.endTime || undefined,
        } as AgentDocument;
        const createdDoc = await this.create(newDoc);
        return createdDoc;
      }
      const updatedDoc: AgentDocument = {
        ...existingDoc,
        ...item,
      } as AgentDocument;
      const result = await CouchManager.updateDocument(updatedDoc);
      return result as AgentDocument;
    } catch (error) {
      console.error(`Error updating agent with id ${id}:`, error);
      return null;
    }
  }

  async count(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  async findAll(): Promise<AgentDocument[]> {
    try {
      const queryResult = await CouchManager.findView(
        AgentCouchRepository.designDocId,
        "by_name",
        { include_docs: "true" }
      );
      const agents: AgentDocument[] = queryResult.rows
        .map((row) => row.doc)
        .filter((doc): doc is AgentDocument => doc !== undefined);
      return agents;
    } catch (error) {
      console.error("Error fetching all agents:", error);
      return [];
    }
  }

  async updateExploringTime(isStart: boolean = true) {
    try {
      // const url = `${CouchDB.dbUrl}/_design/agent_views/_view/by_name`;
      const queryResult = await CouchManager.findView(
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
        if (isStart) agentDoc.startTime = new Date(); // .toISOString()
        else agentDoc.endTime = new Date(); // .toISOString()

        await CouchManager.updateDocument(agentDoc);
        return;
      } else {
        console.warn(
          `Agent document not found for name: ${agent.name}. Creating a new document.`
        );
        const newAgent: AgentDocument = {
          _id: `${agent.name}`,
          type: "agent",
          name: agent.name,
          startTime: isStart ? new Date() : undefined, // .toISOString()
          endTime: !isStart ? new Date() : undefined, // .toISOString()
        } as AgentDocument;
        await this.create(newAgent);
        return;
      }
    } catch (error) {
      console.error("Error updating start time:", error);
    }
  }
}
