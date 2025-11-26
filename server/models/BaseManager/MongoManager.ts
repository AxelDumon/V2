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
    this.cellRepository = new CellMongoRepository(
      () => ({} as Collection<Cell>)
    );
    this.agentRepository = new AgentMongoRepository(
      () => ({} as Collection<Agent>)
    );
    this.replicationClient = {} as MongoClient;
    this.localClient = {} as MongoClient;
    this.db = {} as Db;
    this.checkIntervalId = undefined;
    this.replicateIntervalId = undefined;
  }

  async ManagerFactory(): Promise<MongoManager> {
    console.log("Creating MongoManager instance");
    const manager = new MongoManager();
    const options: any = {
      serverApi: { version: "1" },
      maxConnecting: 3,
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 3000,
    };
    try {
      manager.replicationClient = new MongoClient(
        MongoManager.repl_uri,
        options
      );
      manager.localClient = new MongoClient(MongoManager.standalone_uri, {
        ...options,
        directConnection: true,
      });
      console.log("Connecting to replication client...");
      await manager.replicationClient.connect();
      console.log("Replication client connected.");

      console.log("Connecting to local client...");
      await manager.localClient.connect();
      console.log("Local client connected.");
    } catch (e) {
      console.error("Failed to connect to MongoDB clients", e);
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

  async manageDBReference(): Promise<void> {
    console.log("Managing DB reference...");
    console.log("Connection type:", this.connectionType);
    try {
      if (this.connectionType === "repl") {
        this.db = this.replicationClient.db("v2grid");
      } else {
        this.db = this.localClient.db("v2grid");
        console.log("Pinging standalone MongoDB...");
        await this.db.command({ ping: 1 });
        console.log("Ping successful.");
      }

      // Reinitialize the repositories with the new DB reference
      await this.manageCollectionReferences();
      console.log("Repositories reinitialized with the new DB reference.");
    } catch (e) {
      console.error("Failed to manage DB reference : ", e);
      console.log("Retrying in 2 seconds...");
      setTimeout(async () => {
        await this.manageDBReference();
      }, 2000);
    } finally {
    }
  }

  async manageCollectionReferences(): Promise<void> {
    this.cellRepository = new CellMongoRepository(() =>
      this.db.collection("cells")
    );
    this.agentRepository = new AgentMongoRepository(() =>
      this.db.collection("agents")
    );
    console.log("Collection references updated.");
    // Test the connections
    console.log(
      "test connection",
      await this.cellRepository.collectionGetter().findOne({})
    );
    console.log(
      "test connection",
      await this.agentRepository.collectionGetter().findOne({})
    );
  }

  async manageConnection(): Promise<void> {
    try {
      this.clearIntervals();

      // Only connect the client required for current mode
      if (this.connectionType === "repl") {
        console.log("Using replica set connection.");
        try {
          await this.replicationClient.connect();
        } catch (e) {
          console.error("Failed to connect local client in repl mode:", e);
        }
      } else {
        console.log("Using standalone connection.");
        try {
          await this.localClient.connect();
        } catch (e) {
          console.error(
            "Failed to connect local client in standalone mode:",
            e
          );
        }
      }

      // Manage the DB reference based on the connection type
      await this.manageDBReference();
      console.log("Connected to database:", this.db.databaseName);
      this.db
        .watch([], { fullDocument: "updateLookup" })
        .on("change", (change) => {
          if ("fullDocument" in change && change.fullDocument) {
            // console.log("Change detected:", change.fullDocument);
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

      // Set up periodic checks and replication based on connection type
      this.checkIntervalId = setInterval(async () => {
        await this.checkReplicaSetHealth();
      }, 3000);
      if (this.connectionType === "repl")
        this.replicateIntervalId = setInterval(async () => {
          await this.replicateDataToStandalone();
        }, 5000);
    } catch (e) {
      console.error("Failed to connect to MongoDB", e);
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
        .collectionGetter()
        .aggregate([
          { $unwind: "$agents" },
          { $group: { _id: "$agents", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      // Step 2: Fetch all agents from the agent collection
      const agents = await this.agentRepository.findAll();

      // Step 3: Map stats with agent information and calculate duration
      const statsWithTime = agents.map((agent) => {
        const stat = stats.find((s) => s._id === agent.name);
        let duration = null;
        if (agent.startTime && agent.endTime) {
          duration =
            (new Date(agent.endTime).getTime() -
              new Date(agent.startTime).getTime()) /
            1000;
        }
        return {
          ...stat,
          name: agent?.name || stat?._id || "Unknown",
          duration: duration || 0,
          tilesExplored: stat ? stat.count : 0,
          offlineTime: 0,
          startTime: agent.startTime,
          endTime: agent.endTime,
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
    const testClient = new MongoClient(MongoManager.repl_uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 3000,
      maxConnecting: 3,
    });

    try {
      await testClient.connect();
      const adminDb = testClient.db("admin");

      // rs.status()
      const status = await adminDb.command(
        { replSetGetStatus: 1 },
        { timeoutMS: 2000 }
      );

      // Check the members' states
      const healthyMembers = status.members.filter((member: any) =>
        ["PRIMARY", "SECONDARY"].includes(member.stateStr)
      );

      if (healthyMembers.length >= 3 && this.connectionType === "standalone") {
        console.log(
          "Replica set is healthy with at least 3 members. Switching to repl mode..."
        );

        this.connectionType = "repl";
        try {
          await this.replicationClient.close();
        } catch (closeError) {
          console.warn("Failed to close replication client:", closeError);
        }
        this.replicationClient = new MongoClient(MongoManager.repl_uri, {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 3000,
          socketTimeoutMS: 3000,
          maxConnecting: 3,
        });
        try {
          await this.replicationClient.connect();
        } catch (connectError) {
          console.warn(
            "Failed to connect new replication client:",
            connectError
          );
        }
        await this.replicateDataToRepl();
        await this.manageConnection();
      } else if (healthyMembers.length < 3 && this.connectionType === "repl") {
        console.log(
          "Replica set is unhealthy. Less than 3 members are healthy. Switching to standalone mode..."
        );
        this.connectionType = "standalone";
        await this.manageConnection();
      }
    } catch (error) {
      console.error("Failed to check replica set health:", error);
      if (this.connectionType !== "standalone") {
        console.log("Switching to standalone mode...");
        this.connectionType = "standalone";

        try {
          await this.localClient.close();
        } catch (closeError) {
          console.error("Failed to close local client:", closeError);
        }

        this.localClient = new MongoClient(MongoManager.standalone_uri, {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 3000,
          socketTimeoutMS: 3000,
          maxConnecting: 3,
          directConnection: true,
        });

        await this.manageConnection();
      }
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
      const standaloneCellRepo = new CellMongoRepository(() =>
        standaloneDb.collection("cells")
      );
      const standaloneAgentRepo = new AgentMongoRepository(() =>
        standaloneDb.collection("agents")
      );

      const cellBulkOps = cells.map((cell) => ({
        updateOne: {
          filter: { _id: cell._id },
          update: { $set: cell },
          upsert: true,
        },
      }));

      if (cells.length > 0) {
        await standaloneCellRepo.collectionGetter().deleteMany({});
        await standaloneCellRepo.collectionGetter().bulkWrite(cellBulkOps);
      }

      // Replicate Agents
      const agentBulkOps = agents.map((agent) => ({
        updateOne: {
          filter: { _id: agent._id },
          update: { $set: agent },
          upsert: true,
        },
      }));

      if (agents.length > 0) {
        await standaloneAgentRepo.collectionGetter().deleteMany({});
        await standaloneAgentRepo.collectionGetter().bulkWrite(agentBulkOps);
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
      await this.localClient.connect();

      const localDB = this.localClient.db("v2grid");
      const distantDB = this.replicationClient.db("v2grid");

      // distant cells
      const distanceCollection = new CellMongoRepository(() =>
        distantDB.collection("cells")
      );
      const distantCells = await distanceCollection.findAll();

      const distantPositions = new Set(
        distantCells.map((c) => `${c.x}:${c.y}`)
      );
      // Replicate Cells
      const localCellRepo = new CellMongoRepository(() =>
        localDB.collection("cells")
      );
      const localCells = await localCellRepo.findAll();

      const cellsToInsert = localCells
        .filter((localCell) => localCell.valeur !== 0)
        .filter(
          (localCell) => !distantPositions.has(`${localCell.x}:${localCell.y}`)
        );

      const cellBulkOps = cellsToInsert.map((cell) => ({
        updateOne: {
          filter: { _id: cell._id },
          update: { $set: cell },
          upsert: true,
        },
      }));

      if (cellBulkOps.length > 0) {
        await localCellRepo.collectionGetter().bulkWrite(cellBulkOps);
      }

      console.log("Data replication to repl MongoDB completed.");
    } catch (error) {
      console.error("Failed to replicate data to repl MongoDB:", error);
    }
  }
}
