import { MongoClient } from "mongodb";
import { MongoManager } from "../models/BaseManager/MongoManager.js";
import { CellMongoRepository } from "../models/repositories/CellMongoRepository.js";
import { Agent } from "../models/Agent.js";
import { Cell } from "../models/Cell.js";

export class MongoRsetFailover {
  static async init() {
    const manager = new MongoManager();
    // manager.connectionType = "repl";
    manager.replicationClient = new MongoClient(MongoManager.repl_uri);
    manager.localClient = new MongoClient(MongoManager.standalone_uri);
    // Connect to both clients
    await manager.replicationClient.connect();
    await manager.localClient.connect();
    return manager;
  }

  static async testCollectionChange() {
    const manager = await MongoRsetFailover.init();

    // Start with the replica set
    manager.connectionType = "repl";
    manager.db = manager.replicationClient.db("v2grid");
    manager.cellRepository = new CellMongoRepository(() =>
      manager.db.collection("cells")
    );
    // Set the base manager for Agent
    Agent.setBaseManager(manager);
    console.log("Starting insertion loop...");

    // Start inserting documents in a separate async function to simulate ongoing operations

    const insertLoop = async () => {
      console.log("Inserting document...");
      const cell = new Cell(0, 0);
      await Agent.getCellRepository().create(cell);
      console.log("Inserted document:", cell);
    };
    // Insert a document every 5 seconds
    const intervalRef = setInterval(insertLoop, 5000);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Now switch to standalone
    manager.connectionType = "standalone";
    manager.db = manager.localClient.db("v2grid");
    manager.cellRepository = new CellMongoRepository(() =>
      manager.db.collection("cells")
    );
    console.log("Switched to standalone. Inserting document...");
    await Agent.getCellRepository().create(new Cell(0, 0));
    // Wait for a while to observe behavior
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Clean up
    clearInterval(intervalRef);
    await manager.replicationClient.close();
    await manager.localClient.close();
  }

  static async testConnectionWhenOfflineOnLocal() {
    const manager = await MongoRsetFailover.init();

    // Start with the replica set
    manager.connectionType = "standalone";
    manager.db = manager.localClient.db("v2grid");
    manager.cellRepository = new CellMongoRepository(() =>
      manager.db.collection("cells")
    );
    // Set the base manager for Agent
    Agent.setBaseManager(manager);

    console.log(
      "Setting up a countdown to allow you to turn off internet connection."
    );
    console.log("Starting countdown loop...");
    for (let i = 5; i > 0; i--) {
      console.log(`Inserting document in ${i} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("Inserting document...");
    const cell = new Cell(0, 0);
    await Agent.getCellRepository().create(cell);
    console.log("Inserted document:", cell);

    // Clean up
    await manager.replicationClient.close();
    await manager.localClient.close();
  }
}
