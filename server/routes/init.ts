import express from "express";
import dotenv from "dotenv";
import { Agent } from "../models/Agent.js";
dotenv.config();

const router = express.Router();

router.post("/", async (_req, res) => {
  const n = await Agent.getCellRepository().initGrid();
  res.json({ status: "initialized", count: n });
});

export default router;
