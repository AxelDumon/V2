import express from "express";
import { Agent } from "../models/Agent.js";
import { agent } from "../app.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const stats = await Agent.getBaseManager().getAgentStats();
    res.json(stats);
  } catch (err: Error | any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/is-exploring", async (_req, res) => {
  try {
    res.json({ isExploring: agent.isExploring || false });
  } catch (err: Error | any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
