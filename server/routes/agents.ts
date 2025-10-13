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

export default router;
