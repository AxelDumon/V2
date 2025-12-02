import { configDotenv } from "dotenv";
import { AgentRepository } from "../repositories/interfaces/AgentRepository";
import { CellRepository } from "../repositories/interfaces/CellRepository";
import { SimulationProps } from "../utils/types";
import { BaseManager } from "./interfaces/BaseManager";
import { broadcastUpdate } from "../utils/WebSocket";
import { AgentDocument, AllDocs, DesignDoc } from "../utils/couchTypes";
import { Agent } from "../Agent";
import designDocs from "../views";
import { AgentCouchRepository } from "../repositories/AgentCouchRepository";

configDotenv();

export class CouchManager extends BaseManager {
  cellRepository: CellRepository;
  agentRepository: AgentRepository;
  static dbName: string = process.env.DB_NAME || "v2grid";
  static dbUrl: string =
    process.env.COUCHDB_URL || "http://localhost:5984/v2grid";
  static authHeader: string = `Basic ${Buffer.from(
    `${process.env.COUCHDB_USER || "admin"}:${
      process.env.COUCHDB_PASSWORD || "password"
    }`
  ).toString("base64")}`;

  constructor() {
    super();
    this.cellRepository = {} as CellRepository;
    this.agentRepository = {} as AgentRepository;
  }

  async initBase(): Promise<number> {
    try {
      await CouchManager.createDB();
      for (const [name, designDoc] of Object.entries(designDocs)) {
        console.log(`Uploading design document: ${name}`);
        await CouchManager.uploadDesignDoc(designDoc);
      }
      console.log("CouchDB initialized successfully.");

      const cellNumber = await this.cellRepository.count();
      await this.cellRepository.deleteAll();
      console.log(`Cell count before initialization: ${cellNumber}`);

      return 0;
      // if (cellNumber === 0) await this.cellRepository.initGrid();
      // else console.log(`Grille déjà initialisée (${cellNumber} cases)`);
    } catch (error) {
      console.error("Error initializing CouchDB:", error);
      return -1;
    }
  }

  // Upload a design document
  static async uploadDesignDoc(designDoc: DesignDoc): Promise<void> {
    console.log("Uploading design document:", designDoc._id);
    const url = `${CouchManager.dbUrl}/${designDoc._id}`;
    console.log("Design document URL:", url);
    try {
      // Check if the design document already exists
      const existingDoc = await fetch(url, {
        method: "GET",
        headers: { Authorization: CouchManager.authHeader },
      });

      if (existingDoc.ok) {
        const existingData = await existingDoc.json();
        designDoc._rev = existingData._rev; // Add the revision ID to update the document
      }

      // Upload the design document
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: CouchManager.authHeader,
        },
        body: JSON.stringify(designDoc),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to upload design document: ${response.statusText}`
        );
      }

      console.log(`Design document uploaded: ${designDoc._id}`);
    } catch (error) {
      console.error("Error uploading design document:", error);
    }
  }

  getCellRepository(): CellRepository {
    return this.cellRepository;
  }
  getAgentRepository(): AgentRepository {
    return this.agentRepository;
  }

  static async createDB(): Promise<void> {}

  async ManagerFactory(): Promise<BaseManager> {
    console.log("CouchManager Factory");
    const couchManager = new CouchManager();
    couchManager.cellRepository = new CellCouchRepository();
    couchManager.agentRepository = new AgentCouchRepository();
    await couchManager.initBase();
    return couchManager;
  }

  static async monitorReplication() {
    const url = `${CouchManager.dbUrl}/_changes?feed=continuous&include_docs=true`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: CouchManager.authHeader },
      });
      const reader = response.body?.getReader();

      if (!reader) {
        console.error("Failed to read replication changes feed");
        return;
      }

      console.log("[CouchDB] Monitoring replication changes...");
      let buffer = ""; // Buffer to store incomplete chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and append it to the buffer
        buffer += new TextDecoder().decode(value);

        // Split the buffer into lines
        const lines = buffer.split("\n");

        // Process all complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const change = JSON.parse(line);
              // console.log('[CouchDB] Change detected:', change);

              // Broadcast the change to WebSocket clients
              broadcastUpdate({ type: "db_change", data: change });
            } catch (parseError) {
              console.error("[CouchDB] Error parsing line:", line, parseError);
            }
          }
        }

        // Keep the last incomplete line in the buffer
        buffer = lines[lines.length - 1];
      }
    } catch (error) {
      console.error("[CouchDB] Error monitoring replication:", error);
    }
  }

  static async monitorConflicts() {
    const changesUrl = `${CouchManager.dbUrl}/_changes?feed=longpoll&filter=_view&view=conflicts/by_conflicting_cells`;
    try {
      console.log("[CouchDB] Monitoring conflicts using longpoll...");

      while (true) {
        // Fetch changes using longpoll
        const response = await fetch(changesUrl, {
          headers: { Authorization: CouchManager.authHeader },
        });

        if (!response.ok) {
          console.error(
            `[CouchDB] Failed to fetch changes: ${response.statusText}`
          );
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry after delay
          continue;
        }

        console.log("[CouchDB] Changes detected:", response.statusText);

        // Query the by_conflicting_cells view to ensure no conflicts are missed
        await CouchManager.resolveConflictsFromView();
      }
    } catch (error) {
      console.error("[CouchDB] Error monitoring conflicts:", error);
      // Retry after delay
      await new Promise((resolve) => setTimeout(resolve, 5000));
      CouchManager.monitorConflicts();
    }
  }

  static async resolveConflictsFromView() {
    const viewUrl = `${CouchManager.dbUrl}/_design/conflicts/_view/by_conflicting_cells?include_docs=true`;

    try {
      console.log(
        "[CouchDB] Querying by_conflicting_cells view for unresolved conflicts..."
      );
      const response = await fetch(viewUrl, {
        headers: { Authorization: CouchManager.authHeader },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to query by_conflicting_cells view: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("[CouchDB] Conflicts found in view:", data);

      for (const row of data.rows || []) {
        const { id, value } = row;
        const { current, conflicts } = value;

        console.log(
          `[CouchDB] Processing document ${id} with conflicts:`,
          value
        );

        if (
          current &&
          conflicts &&
          current.agents[0] === process.env.AGENT_NAME
        ) {
          console.log(`[CouchDB] Resolving conflict for document ${id}`);
          await CouchManager.resolveConflict(id, current, conflicts);
        }
      }
    } catch (error) {
      console.error("[CouchDB] Error resolving conflicts from view:", error);
    }
  }

  static async resolveConflict(
    docId: string,
    current: CellDocument,
    conflicts: string[]
  ) {
    try {
      const conflictDocs = await Promise.all(
        conflicts.map((conflictRev) =>
          fetch(`${CouchManager.dbUrl}/${docId}?rev=${conflictRev}`, {
            headers: { Authorization: CouchManager.authHeader },
          }).then((res) => res.json())
        )
      );
      const mergedDoc = {
        ...current,
        valeur: current.valeur + conflictDocs.reduce((sum) => sum + 1, 0),
        agents: Array.from(
          conflictDocs.reduce((set, d) => {
            (d.agents || []).forEach((agent: string) => set.add(agent));
            return set;
          }, new Set(current.agents || []))
        ).reverse(),
        _conflicts: undefined, // Remove conflicts field
      };

      const resolvedDoc = await CouchManager.updateDocument(mergedDoc);

      if (resolvedDoc) console.log(`[CouchDB] Document ${docId} resolved.`);
      else console.error(`[CouchDB] Failed to resolve document ${docId}.`);

      await CouchManager.bulkDocs(
        conflictDocs.map((conflict) => ({
          _id: conflict._id,
          _rev: conflict._rev,
          _deleted: true,
        }))
      );

      console.log(
        `[CouchDB] Conflicting revisions deleted for document ${docId}`
      );
      return resolvedDoc;
    } catch (error) {
      console.error(
        `[CouchDB] Error resolving conflict for document ${docId}:`,
        error
      );
    }
  }

  static async getAgentStatsView(): Promise<any> {
    try {
      const res = await fetch(
        CouchManager.dbUrl +
          "/_design/agent_views/_view/count_by_agent?group=true",
        {
          headers: { Authorization: CouchManager.authHeader },
        }
      );
      const data: AllDocs = await res.json();
      return data.rows.map((row) => ({
        name: row.key,
        count: row.value,
      }));
    } catch (error) {
      console.error("Error fetching agent stats:", error);
      throw error;
    }
  }

  async getAgentStats(): Promise<any> {
    try {
      const stats = await CouchManager.getAgentStatsView();
      const agents: AllDocs = await fetch(
        `${CouchManager.dbUrl}/_all_docs?include_docs=true`,
        {
          headers: { Authorization: CouchManager.authHeader },
        }
      ).then((res) => res.json());

      const agentsData: AgentDocument[] = agents.rows
        .map((row) => row.doc)
        .filter(
          (doc): doc is AgentDocument => doc !== undefined && "name" in doc
        );

      return stats.map((stat: any) => {
        const agent = agentsData.find((a) => a.name === stat.name);
        let duration = null;
        if (agent?.startTime && agent?.endTime) {
          duration =
            (new Date(agent.endTime).getTime() -
              new Date(agent.startTime).getTime()) /
            1000;
        }
        return { ...stat, duration };
      });
    } catch (error) {
      console.error("Error fetching agent stats with duration:", error);
      throw error;
    }
  }

  getSimulationStats(): Promise<SimulationProps> {
    throw new Error("Method not implemented.");
  }
}
