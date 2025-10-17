import { Document } from "mongodb";

export type CellDocument = Document & {
  x: number;
  y: number;
  valeur: number;
  agents: string[];
};
