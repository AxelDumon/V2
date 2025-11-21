import { Collection, Db, MongoClient } from "mongodb";
import { AgentMongoRepository } from "../repositories/AgentMongoRepository.js";
import { CellMongoRepository } from "../repositories/CellMongoRepository.js";
import { AgentRepository } from "../repositories/interfaces/AgentRepository.js";
import { CellRepository } from "../repositories/interfaces/CellRepository.js";
import { BaseManager } from "./interfaces/BaseManager.js";
import { Cell } from "../Cell.js";

import dotenv from "dotenv";
import { broadcastUpdate } from "../utils/WebSocket.js";
import { Agent } from "../Agent.js";
import { AgentStats, SimulationProps } from "../utils/types.js";
dotenv.config();

export class MongoManager extends BaseManager {
  cellRepository: CellMongoRepository;
  agentRepository: AgentMongoRepository;
  replicationClient: MongoClient;
  localClient: MongoClient;
  db: Db;
  connectionType: "repl" | "standalone" = "repl";
  checkIntervalId?: NodeJS.Timeout;
  replicateIntervalId?: NodeJS.Timeout;

  static repl_uri: string = process.env.REPL_MONGO_URI!;
  static standalone_uri: string =
    process.env.STANDALONE_MONGO_URI ||
    "mongodb://localhost:27017?replicaSet=localRset";

  constructor() {
    super();
    this.cellRepository = new CellMongoRepository({} as Collection<Cell>);
    this.agentRepository = new AgentMongoRepository({} as Collection<Agent>);
    this.replicationClient = {} as MongoClient;
    this.localClient = {} as MongoClient;
    this.db = {} as Db;
    this.checkIntervalId = undefined;
    this.replicateIntervalId = undefined;
  }

  async ManagerFactory(): Promise<MongoManager> {
    console.log("Creating MongoManager instance");
    const manager = new MongoManager();
    const options: any = { serverApi: { version: "1" } };
    try {
      this.replicationClient = new MongoClient(MongoManager.repl_uri, options);
      this.localClient = new MongoClient(MongoManager.standalone_uri, options);
      console.log("Connecting to replication client...");
      await this.replicationClient.connect();
      console.log("Replication client connected.");

      console.log("Connecting to local client...");
      await this.localClient.connect();
      console.log("Local client connected.");
    } catch (e) {
      console.error("Failed to connect to MongoDB clients", e);
      throw e;
    }
    await manager.manageConnection();
    await manager.initBase();
    return manager;
  }

  async initBase(): Promise<number> {
    const count = await this.cellRepository.count();
    if (count > 0) {
      return await this.cellRepository.initGrid();
    } else {
      return 0;
    }
  }

  manageDBReference(): void {
    console.log("Managing DB reference...");
    console.log("Connection type:", this.connectionType);
    if (this.connectionType === "repl") {
      console.log("Replication client:", this.replicationClient);
      this.db = this.replicationClient.db("v2grid");
    } else {
      console.log("Local client:", this.localClient);
      this.db = this.localClient.db("v2grid");
    }
    this.manageCollectionReferences();
  }

  manageCollectionReferences(): void {
    this.cellRepository = new CellMongoRepository(this.db.collection("cells"));
    this.agentRepository = new AgentMongoRepository(
      this.db.collection("agents")
    );
  }

  async manageConnection(): Promise<void> {
    try {
      this.clearIntervals();
      await this.replicationClient.connect();
      await this.localClient.connect();
      this.manageDBReference();
      console.log("Connected to database:", this.db.databaseName);
      this.db
        .watch([], { fullDocument: "updateLookup" })
        .on("change", (change) => {
          if ("fullDocument" in change && change.fullDocument) {
            broadcastUpdate(change.fullDocument);
          } else {
          }
        })
        .on("error", (err) => {
          console.error("Change stream error:", err);
        })
        .on("close", () => {
          console.warn("Change stream closed, maybe retrying...");
        });
      this.checkIntervalId = setInterval(async () => {
        await this.checkReplicaSetHealth();
      }, 3000);
      this.replicateIntervalId = setInterval(async () => {
        await this.replicateDataToStandalone();
      }, 5000);
    } catch (e) {
      console.error("Failed to connect to MongoDB", e);
      throw e;
    }
    console.log("Connected to MongoDB");
  }

  getCellRepository(): CellRepository {
    return this.cellRepository;
  }
  getAgentRepository(): AgentRepository {
    return this.agentRepository;
  }

  // Methods that need and the cellRepository and agentRepository

  async getAgentStats(): Promise<AgentStats[]> {
    try {
      // Step 1: Aggregate stats from the cell collection
      const stats = await this.cellRepository
        .getCollection()
        .aggregate([
          { $unwind: "$agents" },
          { $group: { _id: "$agents", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      // Step 2: Fetch all agents from the agent collection
      const agents = await this.agentRepository.findAll();

      // Step 3: Map stats with agent information and calculate duration
      const statsWithTime = stats.map((stat) => {
        const agent = agents.find((a) => a.name === stat._id);
        let duration = null;
        if (agent?.startTime && agent?.endTime) {
          duration =
            (new Date(agent.endTime).getTime() -
              new Date(agent.startTime).getTime()) /
            1000;
        }
        return {
          ...stat,
          name: agent?.name || stat._id || "Unknown",
          duration: duration || 0,
          tilesExplored: stat.count,
          offlineTime: 0,
          startTime: agent?.startTime,
          endTime: agent?.endTime,
        };
      });

      return statsWithTime;
    } catch (error) {
      console.error("Failed to get agent stats:", error);
      throw error;
    }
  }

  async getSimulationStats(): Promise<SimulationProps> {
    try {
      const gridSideSize = CellMongoRepository.SIZE;
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
        dbName: this.db.databaseName,
      };
    } catch (error) {
      console.error("Failed to get simulation stats:", error);
      throw error;
    }
  }

  clearIntervals(): void {
    if (this.checkIntervalId !== undefined) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
    }
    if (this.replicateIntervalId !== undefined) {
      clearInterval(this.replicateIntervalId);
      this.replicateIntervalId = undefined;
    }
  }

  async checkReplicaSetHealth() {
    const testClient = new MongoClient(MongoManager.repl_uri);

    try {
      await testClient.connect();
      const adminDb = testClient.db("admin");

      // rs.status()
      const status = await adminDb.command({ replSetGetStatus: 1 });

      // Check the members' states
      const healthyMembers = status.members.filter((member: any) =>
        ["PRIMARY", "SECONDARY"].includes(member.stateStr)
      );

      if (healthyMembers.length >= 3 && this.connectionType === "standalone") {
        console.log(
          "Replica set is healthy with at least 3 members. Switching to repl mode..."
        );

        this.connectionType = "repl";
        await this.manageConnection();
        await this.replicateDataToRepl();
      } else if (healthyMembers.length < 3 && this.connectionType === "repl") {
        console.log(
          "Replica set is unhealthy. Less than 3 members are healthy. Switching to standalone mode..."
        );
        this.connectionType = "standalone";
        await this.manageConnection();
      }
    } catch (error) {
      console.error("Failed to check replica set health:", error);
    } finally {
      await testClient.close();
    }
  }

  async replicateDataToStandalone(): Promise<void> {
    // Replicate data from repl to standalone
    if (this.connectionType !== "repl") {
      console.log("Not in repl mode. Skipping data replication.");
      return;
    }

    try {
      const cells = await this.cellRepository.findAll();
      const agents = await this.agentRepository.findAll();
      // Replicate Cells

      const standaloneDb = this.localClient.db("v2grid");
      const standaloneCellRepo = new CellMongoRepository(
        standaloneDb.collection("cells")
      );
      if (cells.length > 0) {
        await standaloneCellRepo.getCollection().deleteMany({});
        await standaloneCellRepo.getCollection().insertMany(cells);
      }

      // Replicate Agents
      const standaloneAgentRepo = new AgentMongoRepository(
        standaloneDb.collection("agents")
      );
      if (agents.length > 0) {
        await standaloneAgentRepo.getCollection().deleteMany({});
        await standaloneAgentRepo.getCollection().insertMany(agents);
      }

      console.log("Data replication to standalone MongoDB completed.");
    } catch (error) {
      console.error("Failed to replicate data to standalone MongoDB:", error);
    }
  }

  async replicateDataToRepl(): Promise<void> {
    if (this.connectionType !== "repl") {
      console.log("Not in repl mode. Skipping data replication.");
      return;
    }
    try {
      const localDB = this.localClient.db("v2grid");
      const distantCells = await this.cellRepository.findAll();

      // Replicate Cells
      const localCellRepo = new CellMongoRepository(
        localDB.collection("cells")
      );
      const localCells = await localCellRepo.findAll();
      const cellsToInsert = distantCells.filter(
        (distantCell) =>
          !localCells.some(
            (localCell) =>
              localCell.x === distantCell.x && localCell.y === distantCell.y
          )
      );
      if (cellsToInsert.length > 0) {
        await this.cellRepository.getCollection().insertMany(cellsToInsert);
      }

      console.log("Data replication to repl MongoDB completed.");
    } catch (error) {
      console.error("Failed to replicate data to repl MongoDB:", error);
    }
  }
}
