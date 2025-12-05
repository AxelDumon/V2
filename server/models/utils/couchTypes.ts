// https://docs.couchdb.org/en/stable/json-structure.html#couchdb-document

import { Agent } from "../Agent.js";
import { Cell } from "../Cell.js";

export type DesignDoc = {
  _id: string; // The ID of the design document (e.g., "_design/example")
  _rev?: string; // Optional revision ID for updates
  views: {
    [viewName: string]: {
      map: string; // The map function as a string
      reduce?: string; // Optional reduce function as a string
    };
  };
  language?: string; // Optional language (default is "javascript")
  options?: {
    partitioned?: boolean; // Optional partitioning option
  };
};

export type AllDocs = {
  total_rows: number;
  offset: number;
  rows: Array<{
    id: string;
    key: string;
    value: {
      rev: string;
    };
    doc?: CellDocument | AgentDocument; // The actual document, if include_docs=true was used
  }>;
};

export type Document = {
  _id: string;
  _rev?: string;
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

// export type Cell = {
//   x: number;
//   y: number;
//   valeur: number;
//   agents: string[];
// };

export type CellDocument = Document &
  Cell & {
    type: "cell";
  };

// export type AgentDocument = Document & {
//   type: "agent";
//   name: string;
//   startTime?: string; // ISO date string
//   endTime?: string; // ISO date string
// };

export type AgentDocument = Document &
  Agent & {
    type: "agent";
    tilesExplored?: number;
    offlineTime?: number; // Seconds
    // name: string;
    duration?: number; // Seconds
    // startTime?: Date;
    // endTime?: Date;
    // isExploring?: boolean;
  };

export function isAgentDocument(obj: any): obj is AgentDocument {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    (obj.startTime === undefined || typeof obj.startTime === "string") &&
    (obj.endTime === undefined || typeof obj.endTime === "string")
  );
}
