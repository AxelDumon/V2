import { BaseManager } from "./BaseManager/interfaces/BaseManager.js";
import { SimulationManager } from "./utils/SimulationManager.js";

export class Agent {
  _id?: string;
  name: string;
  startTime?: Date;
  endTime?: Date;
  isExploring?: boolean;
  static baseManager: BaseManager;

  constructor(name: string, _id?: string) {
    if (_id) this._id = _id;
    this.name = name;
  }

  static setBaseManager(manager: BaseManager) {
    Agent.baseManager = manager;
  }
  static getBaseManager(): BaseManager {
    if (!Agent.baseManager) throw new Error("BaseManager not set for Agent");
    return Agent.baseManager;
  }
  static getAgentRepository() {
    return Agent.getBaseManager().getAgentRepository();
  }
  static getCellRepository() {
    return Agent.getBaseManager().getCellRepository();
  }

  async explore(DELAY = 1000): Promise<void> {
    if (this.isExploring) throw new Error("Agent is already exploring");
    this.isExploring = true;
    console.log(`[${this.explore.name}] Agent ${this.name} started exploring`);

    this.startTime = new Date();
    this.endTime = undefined;

    await Agent.getAgentRepository().update(this._id!, this);
    // Agent.getAgentRepository().updateExploringTime(true);

    // Cell to discover
    let cell = await Agent.getCellRepository().getRandomUndiscoveredCell();
    if (!cell) {
      console.log(`[${this.explore.name}] No undiscovered cells left`);
      this.isExploring = false;
      this.endTime = new Date();
      await Agent.getAgentRepository().updateExploringTime(false);
      return;
    }

    // Agent's position
    let x = cell.x;
    let y = cell.y;

    while (true) {
      let foundFrontier = false;
      const neighbors =
        await Agent.getCellRepository().getUndiscoveredNeighbors(x, y);
      if (neighbors && neighbors.length > 0) {
        const undiscoveredCell =
          neighbors[Math.floor(Math.random() * neighbors.length)];
        const nx = undiscoveredCell.x;
        const ny = undiscoveredCell.y;
        try {
          const reserved = await Agent.getCellRepository().updateCell(
            nx,
            ny,
            1,
            this._id!
          );
          if (reserved) {
            x = nx;
            y = ny;
            console.log(
              `[${this.explore.name}] Agent ${this.name} explored (${x}, ${y})`
            );
            await new Promise((resolve) => setTimeout(resolve, DELAY));
            foundFrontier = true;
          } else {
            console.log(
              `[${this.explore.name}] Cell (${nx}, ${ny}) already reserved, looking for another frontier`
            );
          }
        } catch (e) {
          x = nx;
          y = ny;
          foundFrontier = true;
          console.error(
            `[${this.explore.name}] Error updating cell (${nx}, ${ny}):`,
            e
          );
          await new Promise((resolve) => setTimeout(resolve, DELAY));
        }
      }
      if (!foundFrontier) {
        console.log(
          `[${this.explore.name}] No frontier found for Agent ${this.name}, teleporting...`
        );
        try {
          const undiscoveredCell =
            await Agent.getCellRepository().getRandomUndiscoveredCell();
          if (!undiscoveredCell) {
            console.log(
              `[${this.explore.name}] No undiscovered cells left, exploration finished`
            );
            break;
          }
          const reserved = await Agent.getCellRepository().updateCell(
            undiscoveredCell.x,
            undiscoveredCell.y,
            1,
            this._id!
          );
          if (reserved) {
            x = undiscoveredCell.x;
            y = undiscoveredCell.y;
            console.log(
              `[${this.explore.name}] Agent ${this.name} teleported to (${x}, ${y})`
            );
            await new Promise((resolve) => setTimeout(resolve, DELAY));
          }
        } catch (e) {
          console.error(`[${this.explore.name}] Error teleporting:`, e);
          await new Promise((resolve) => setTimeout(resolve, DELAY));
        }
      }
    }

    this.isExploring = false;
    this.endTime = new Date();
    await Agent.getAgentRepository().update(this._id!, this);
    // await Agent.getAgentRepository().updateExploringTime(false);
    console.log(
      `[${this.explore.name}] Agent ${this.name} finished exploring in ${(
        (this.endTime.getTime() - this.startTime.getTime()) /
        1000
      ).toFixed(2)} seconds`
    );

    // Wait for every agent to finish
    while (true) {
      const agents = await Agent.getAgentRepository().findAll();
      const exploringAgents = agents.filter((a) => a.isExploring);
      if (exploringAgents.length === 0) break;
      console.log(
        `[${
          this.explore.name
        }] Waiting for other agents to finish... (${exploringAgents
          .map((a) => a.name)
          .join(", ")})`
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    console.log(`[${this.explore.name}] Saving simulation results...`);

    await SimulationManager.addExperience(
      await Agent.getBaseManager().getSimulationStats()
    );
  }
}
