import { Db, MongoClient } from "mongodb";
import { AgentMongoRepository } from "../repositories/AgentMongoRepository";
import { CellMongoRepository } from "../repositories/CellMongoRepository";
import { AgentRepository } from "../repositories/interfaces/AgentRepository";
import { CellRepository } from "../repositories/interfaces/CellRepository";
import { BaseManager } from "./interfaces/BaseManager";

export class MongoManager extends BaseManager {
  cellRepository: CellRepository;
  agentRepository: AgentRepository;
  client: MongoClient;
  db: Db;

  constructor() {
    super();
    this.cellRepository = {} as CellRepository;
    this.agentRepository = {} as AgentRepository;
    this.client = {} as MongoClient;
    this.db = {} as Db;
  }

  async ManagerFactory(): Promise<MongoManager> {
    const manager = new MongoManager();
    await manager.connectToDatabase();
    return manager;
  }

  initBase(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async connectToDatabase(): Promise<void> {
    let uri = process.env.REPL_MONGO_URI;
    let options: any = { serverApi: { version: "1" } };
    try {
      this.client = new MongoClient(uri!, options);
      await this.client.connect();
      this.db = this.client.db("v2grid");
      this.cellRepository = new CellMongoRepository(
        this.db.collection("cells")
      );
      this.agentRepository = new AgentMongoRepository(
        this.db.collection("agents")
      );
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
}
