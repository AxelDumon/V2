import fs from "node:fs";
import { SimulationProps } from "./types";
import { configDotenv } from "dotenv";

configDotenv({ debug: true });

interface SimulationManagerProps {
  simulations: SimulationProps[];
}

export class SimulationManager {
  static RESULTS_FOLDER: fs.PathLike = `/tmp/exploration-${
    process.env.SIMULATION_NAME || "default"
  }.json`;
  static WRITE_OPTIONS = { flag: "a", mode: "644" };

  static async addExperience(
    result: SimulationProps,
    path: fs.PathLike = SimulationManager.RESULTS_FOLDER
  ) {
    try {
      // Check if the file exists and create it if it's not the case
      try {
        await fs.promises.access(path);
      } catch (err) {
        // File does not exist, create it with an empty simulations array
        const initialData: SimulationManagerProps = { simulations: [] };
        await fs.promises.writeFile(path, JSON.stringify(initialData), "utf8");
        console.log(`File created successfully at ${path}`);
      }

      // Read content
      const data = await fs.promises.readFile(path, "utf8");
      const simulationsManager: SimulationManagerProps = JSON.parse(data);

      // Add new simulation with ID
      simulationsManager.simulations.push({
        ...result,
        simulationNumberID: simulationsManager.simulations.length,
      });

      // Write back
      await fs.promises.writeFile(
        path,
        JSON.stringify(simulationsManager.simulations),
        "utf8"
      );
      console.log(`Experience added successfully to ${path}`);
    } catch (error) {
      console.error(`Error adding experience to ${path}:`, error);
    }
  }
}
