import express from "express";
import { Agent } from "../models/Agent.js";
import { agent } from "../app.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const cells = await Agent.getCellRepository().findAll();
  res.json(cells);
});

router.get("/:agent", async (req, res) => {
  const agentName = req.params.agent;
  if (agentName === agent.name) {
    const cells = await Agent.getCellRepository().findAll();
    res.json(cells);
  } else {
    res.status(404).json({ error: "Agent not found" });
  }
});

export default router;
