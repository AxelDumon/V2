import express from "express";
import type { Request, Response } from "express";

import dotenv from "dotenv";
dotenv.config();

import { agent } from "../app.js";

const router = express.Router();

// Start exploration with a new agent
router.post("/", async (_req: Request, res: Response) => {
  try {
    await agent.explore(Number(process.env.DELAY)); // Wait for exploration to finish
    console.log("Exploration finished");
    res.json({ message: "Exploration finished" }); // Send response after completion
  } catch (error: Error | any) {
    console.error("Exploration failed:", error);
    res
      .status(500)
      .json({ message: "Exploration failed", error: error.message });
  }
});

export default router;
