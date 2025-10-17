import { Collection, Db, MongoClient } from "mongodb";
import { AgentMongoRepository } from "../repositories/AgentMongoRepository.js";
import { CellMongoRepository } from "../repositories/CellMongoRepository.js";
import { AgentRepository } from "../repositories/interfaces/AgentRepository.js";
import { CellRepository } from "../repositories/interfaces/CellRepository.js";
import { BaseManager } from "./interfaces/BaseManager.js";
import { Cell } from "../Cell.js";
import { Agent } from "../Agent.js";

import dotenv from "dotenv";
import { broadcastUpdate } from "../utils/WebSocket.js";
dotenv.config();

export class MongoManager extends BaseManager {
  cellRepository: CellMongoRepository;
  agentRepository: AgentMongoRepository;
  client: MongoClient;
  db: Db;

  constructor() {
    super();
    this.cellRepository = new CellMongoRepository({} as Collection<Cell>);
    this.agentRepository = new AgentMongoRepository({} as Collection<Agent>);
    this.client = {} as MongoClient;
    this.db = {} as Db;
  }

  async ManagerFactory(): Promise<MongoManager> {
    console.log("Creating MongoManager instance");
    const manager = new MongoManager();
    await manager.connectToDatabase();
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

  async connectToDatabase(): Promise<void> {
    let uri = process.env.REPL_MONGO_URI;
    let options: any = { serverApi: { version: "1" } };
    try {
      this.client = new MongoClient(uri!, options);
      await this.client.connect();
      this.db = this.client.db("v2grid");
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

  async getAgentStats(): Promise<any> {
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
        return { ...stat, name: agent?.name || stat._id, duration };
      });

      return statsWithTime;
    } catch (error) {
      console.error("Failed to get agent stats:", error);
      throw error;
    }
  }
}
