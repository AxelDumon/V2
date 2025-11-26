import express from "express";
import { Agent } from "../models/Agent.js";

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
    const agents = await Agent.getAgentRepository().findAll();
    if (agents.length === 0) {
      return res.json({ isExploring: false });
    }
    res.json({ isExploring: agents.some((a) => a.isExploring) });
  } catch (err: Error | any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
