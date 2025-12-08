import fs from "node:fs";
import { SimulationProps } from "./couchTypes";
import { configDotenv } from "dotenv";
import path from "node:path";

configDotenv({ debug: true });

interface SimulationManagerProps {
  simulations: SimulationProps[];
}

export class SimulationManager {
  static RESULTS_FOLDER: fs.PathLike = `/opt/app/exploration-${
    process.env.SIMULATION_NAME || "default"
  }.json`;
  static WRITE_OPTIONS = { flag: "a", mode: 0o666 };

  static async addExperience(
    result: SimulationProps,
    filePath: fs.PathLike = SimulationManager.RESULTS_FOLDER
  ) {
    try {
      // Check if the file exists and create it if it's not the case
      try {
        await fs.promises.access(filePath);
      } catch (err) {
        console.warn(
          `[${this.addExperience.name}] File does not exist at ${filePath}. Creating a new one.`
        );
        // File does not exist, create it with an empty simulations array
        await fs.promises.writeFile(
          filePath,
          JSON.stringify([], null, 2),
          this.WRITE_OPTIONS
        );
        console.log(`File created successfully at ${filePath}`);
      }

      // Read content
      const data = await fs.promises.readFile(filePath, "utf8");
      const simulations: SimulationProps[] =
        data.length <= 1 ? [] : JSON.parse(data);
      console.log(simulations);
      const simulationsManager: SimulationManagerProps = {
        simulations: simulations,
      };
      console.log(simulationsManager);

      // Add new simulation with ID
      simulationsManager.simulations.push({
        ...result,
        simulationNumberID: simulationsManager.simulations.length,
      });

      // Write back
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(simulationsManager.simulations, null, 2),
        "utf8"
      );
      console.log(`Experience added successfully to ${filePath}`);
    } catch (error: any) {
      console.error(`Error adding experience to ${filePath}:`, error);

      // Fallback to /tmp on permission error
      if (error && error.code === "EACCES") {
        try {
          const fallback = `/home/axel.dumon.etu/Public/exploration-${
            process.env.SIMULATION_NAME || "default"
          }.json`;
          const fdir = path.dirname(fallback);
          await fs.promises.mkdir(fdir, { recursive: true });
          try {
            await fs.promises.access(
              fallback,
              fs.constants.F_OK | fs.constants.W_OK
            );
          } catch {
            await fs.promises.writeFile(fallback, JSON.stringify([], null, 2), {
              mode: 0o644,
            });
          }
          const data = await fs.promises.readFile(fallback, "utf8");
          const simulations: SimulationProps[] =
            data && data.trim().length ? JSON.parse(data) : [];
          simulations.push({
            ...result,
            simulationNumberID: simulations.length,
          });
          await fs.promises.writeFile(
            fallback,
            JSON.stringify(simulations, null, 2),
            { mode: 0o644 }
          );
          console.warn(
            `Permission denied for ${filePath}, wrote to fallback ${fallback}`
          );
          return;
        } catch (e) {
          console.error(`Fallback write failed:`, e);
        }
      }
    }
  }
}
