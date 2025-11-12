import { Document } from "mongodb";

export type CellDocument = Document & {
  x: number;
  y: number;
  valeur: number;
  agents: string[];
};

export type AgentStats = {
  tilesExplored: number;
  offlineTime?: number; // Seconds
  name: string;
  duration?: number; // Seconds
  startTime?: Date;
  endTime?: Date;
};

export interface SimulationProps {
  gridSideSize: number; // Number of tiles per side
  totalGridSize: number; // Number of tiles in total
  agentsStats: AgentStats[];
  explorationTime: number; // Seconds
  offlineTime: number; // Seconds
  dbName: string;
  simulationNumberID?: number;
}
