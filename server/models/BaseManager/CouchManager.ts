import { configDotenv } from "dotenv";
import { AgentRepository } from "../repositories/interfaces/AgentRepository.js";
import { CellRepository } from "../repositories/interfaces/CellRepository.js";
import { AgentStats, SimulationProps } from "../utils/couchTypes.js";
import { BaseManager } from "./interfaces/BaseManager.js";
import { broadcastUpdate } from "../utils/WebSocket.js";
import {
  AgentDocument,
  AllDocs,
  CellDocument,
  DesignDoc,
  Document,
} from "../utils/couchTypes";
import designDocs from "../views/index.js";
import { AgentCouchRepository } from "../repositories/AgentCouchRepository.js";
import { CellCouchRepository } from "../repositories/CellCouchRepository.js";

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
      await this.cellRepository.deleteAll();
      for (const [name, designDoc] of Object.entries(designDocs)) {
        console.log(`Uploading design document: ${name}`);
        await CouchManager.uploadDesignDoc(designDoc);
      }
      console.log("CouchDB initialized successfully.");

      return 0;
    } catch (error) {
      console.error("Error initializing CouchDB:", error);
      return -1;
    }
  }

  static async callUpdateHandler(
    designName: string,
    updateName: string,
    docId: string,
    params: Record<string, string> = {},
    body: any | null = null
  ) {
    // returns [doc, response : str]
    try {
      const query = new URLSearchParams(params).toString();
      const url = `${CouchManager.dbUrl}/_design/${designName}/_update/${updateName}/${docId}?${query}`;

      const options: RequestInit = {
        method: "PUT",
        headers: {
          Authorization: CouchManager.authHeader,
          "Content-Type": "application/json",
        },
      };

      if (body) options.body = JSON.stringify(body);
      const response = await fetch(url, options);

      if (!response.ok)
        throw new Error(
          `Failed to call update handler: ${response.statusText}`
        );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error calling update handler:", error);
      return null;
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

  static async createDB(): Promise<void> {
    const url = CouchManager.dbUrl;
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: CouchManager.authHeader },
      });

      if (response.status === 201) {
        console.log(`Database created: ${CouchManager.dbName}`);
      } else if (response.status === 412) {
        console.log(`Database already exists: ${CouchManager.dbName}`);
        console.log("Clearing documents for fresh start...");
        const allDocsResponse = await fetch(`${CouchManager.dbUrl}/_all_docs`, {
          headers: { Authorization: CouchManager.authHeader },
        });
        const allDocsData = await allDocsResponse.json();
        const docsToDelete = allDocsData.rows.map((row: any) => ({
          _id: row.id,
          _rev: row.value.rev,
          _deleted: true,
        }));

        if (docsToDelete.length > 0) {
          const bulkDeleteResponse = await fetch(
            `${CouchManager.dbUrl}/_bulk_docs`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: CouchManager.authHeader,
              },
              body: JSON.stringify({ docs: docsToDelete }),
            }
          );

          if (bulkDeleteResponse.ok) {
            console.log(
              `All documents deleted from database: ${CouchManager.dbName}`
            );
          } else {
            console.error(
              `Failed to delete documents: ${bulkDeleteResponse.statusText}`
            );
          }
        } else {
          console.log("No documents to delete.");
        }
      } else {
        throw new Error(`Failed to create database: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error creating database:`, error);
    }
  }

  async ManagerFactory(): Promise<CouchManager> {
    console.log("CouchManager Factory");
    const couchManager = new CouchManager();
    couchManager.cellRepository = new CellCouchRepository(couchManager);
    couchManager.agentRepository = new AgentCouchRepository(couchManager);
    await couchManager.initBase();
    return couchManager;
  }

  async closeAll(): Promise<void> {
    console.log("CouchManager closeAll called - nothing to close.");
    return await Promise.resolve();
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
              broadcastUpdate(change.doc);
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
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry after delay
        const response = await fetch(changesUrl, {
          headers: { Authorization: CouchManager.authHeader },
        });

        if (!response.ok) {
          console.error(
            `[CouchDB] Failed to fetch changes: ${response.statusText}`
          );
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

  static async updateDocument(doc: Document): Promise<Document | null> {
    const url = `${CouchManager.dbUrl}/${doc._id}`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: CouchManager.authHeader,
        },
        body: JSON.stringify(doc),
      });

      if (!response.ok) {
        throw new Error(`Failed to update document: ${response.statusText}`);
      }

      // console.log(`Document updated: ${doc._id}`);
      const data = await response.json();
      return { ...doc, _rev: data.rev };
    } catch (error) {
      console.error("Error updating document:", error);
      return null;
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

  static async bulkDocs(
    bulkDelete: { _id: string; _rev: string | undefined; _deleted: boolean }[]
  ) {
    return fetch(`${CouchManager.dbUrl}/_bulk_docs`, {
      method: "POST",
      headers: {
        Authorization: CouchManager.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ docs: bulkDelete }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to bulk delete documents: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error("Error during bulk delete:", error);
        throw error;
      });
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

  async getAgentStats(): Promise<AgentStats[]> {
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

  async getSimulationStats(): Promise<SimulationProps> {
    try {
      const gridSideSize = CellCouchRepository.SIZE;
      const totalGridSize = gridSideSize * gridSideSize;

      const agentsStats = await this.getAgentStats();

      const explorationTime = agentsStats.reduce((max, agent) => {
        if (agent.duration && agent.duration > max) {
          return agent.duration;
        }
        return max;
      }, 0);
      const offlineTime = Number(process.env.OFFLINE_TIME) || 0;

      return {
        gridSideSize,
        totalGridSize,
        agentsStats,
        explorationTime,
        offlineTime,
        dbName: CouchManager.dbName,
      };
    } catch (error) {
      console.error("Failed to get simulation stats:", error);
      throw error;
    }
  }

  static async findView(
    designName: string,
    viewName: string,
    params: Record<string, string> = {},
    keys?: any[]
  ): Promise<{ total_rows: number; rows: any[] }> {
    try {
      const query = new URLSearchParams(params).toString();
      const url = `${CouchManager.dbUrl}/_design/${designName}/_view/${viewName}?${query}`;

      const options: RequestInit = {
        method: "GET",
        headers: {
          Authorization: CouchManager.authHeader,
        } as Record<string, string>,
      };

      if (keys) {
        options.method = "POST";
        options.body = JSON.stringify({ keys });
        (options.headers as Record<string, string>)["Content-Type"] =
          "application/json";
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Failed to query view: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        total_rows: data.total_rows || 0,
        rows: data.rows || [],
      };
    } catch (error) {
      console.error(`[CouchDB.findView] Error querying view:`, error);
      return { total_rows: 0, rows: [] }; // Return a consistent structure
    }
  }
}
