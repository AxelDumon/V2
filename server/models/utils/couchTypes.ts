// https://docs.couchdb.org/en/stable/json-structure.html#couchdb-document

import { Cell } from "../Cell";

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

export type AgentDocument = Document & {
  type: "agent";
  tilesExplored: number;
  offlineTime?: number; // Seconds
  name: string;
  duration?: number; // Seconds
  startTime?: Date;
  endTime?: Date;
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
