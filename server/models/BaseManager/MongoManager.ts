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
  mainClient: MongoClient;
  secondaryClient: MongoClient;
  db: Db;
  connectionType: "repl" | "standalone" = "repl";

  constructor() {
    super();
    this.cellRepository = new CellMongoRepository({} as Collection<Cell>);
    this.agentRepository = new AgentMongoRepository({} as Collection<Agent>);
    this.mainClient = {} as MongoClient;
    this.secondaryClient = {} as MongoClient;
    this.db = {} as Db;
  }

  async ManagerFactory(): Promise<MongoManager> {
    console.log("Creating MongoManager instance");
    const manager = new MongoManager();
    await manager.connectToDatabase();
    await manager.initBase();
    setInterval(async () => {
      await manager.checkReplicaSetHealth();
    }, 3000);
    setInterval(async () => {
      await manager.replicateDataToStandalone();
    }, 5000);
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

  async connectToDatabase(): Promise<void> {
    let uri =
      this.connectionType === "repl"
        ? process.env.REPL_MONGO_URI
        : process.env.STANDALONE_MONGO_URI || "mongodb://localhost:27017";
    let options: any = { serverApi: { version: "1" } };
    try {
      this.mainClient = new MongoClient(uri!, options);
      await this.mainClient.connect();
      this.db = this.mainClient.db("v2grid");
      console.log("Connected to database:", this.db.databaseName);

      this.cellRepository = new CellMongoRepository(
        this.db.collection("cells")
      );
      this.agentRepository = new AgentMongoRepository(
        this.db.collection("agents")
      );
      this.db
        .watch([], { fullDocument: "updateLookup" })
        .on("change", (change) => {
          if ("fullDocument" in change && change.fullDocument) {
            broadcastUpdate(change.fullDocument);
          } else {
          }
        });
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

  async checkReplicaSetHealth() {
    const replUri = process.env.REPL_MONGO_URI;
    const testClient = new MongoClient(replUri!);

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
        await this.mainClient.close();
        await this.connectToDatabase();
        this.secondaryClient = new MongoClient(
          process.env.STANDALONE_MONGO_URI || "mongodb://localhost:27017"
        );
        await this.secondaryClient.connect();
        await this.replicateDataToRepl();
      } else {
        console.error(
          "Replica set is unhealthy. Less than 3 members are healthy. Switching to standalone mode..."
        );
        this.connectionType = "standalone";
        await this.secondaryClient.close();
        await this.mainClient.close();
        await this.connectToDatabase();
      }
    } catch (error) {
      console.error("Failed to check replica set health:", error);
    } finally {
      await testClient.close();
    }
  }

  async replicateDataToStandalone(): Promise<void> {
    if (this.connectionType !== "repl") {
      console.log("Not in repl mode. Skipping data replication.");
      return;
    }

    try {
      await this.secondaryClient.connect();
      const standaloneDb = this.secondaryClient.db("v2grid");
      const cells = await this.cellRepository.findAll();
      const agents = await this.agentRepository.findAll();
      // Replicate Cells

      const standaloneCellRepo = new CellMongoRepository(
        standaloneDb.collection("cells")
      );
      await standaloneCellRepo.getCollection().deleteMany({});
      if (cells.length > 0) {
        await standaloneCellRepo.getCollection().insertMany(cells);
      }

      // Replicate Agents
      const standaloneAgentRepo = new AgentMongoRepository(
        standaloneDb.collection("agents")
      );
      await standaloneAgentRepo.getCollection().deleteMany({});
      if (agents.length > 0) {
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
      await this.secondaryClient.connect();
      const replDb = this.secondaryClient.db("v2grid");
      const distantCells = await this.cellRepository.findAll();

      // Replicate Cells
      const replCellRepo = new CellMongoRepository(replDb.collection("cells"));
      const localCells = await replCellRepo.findAll();
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
