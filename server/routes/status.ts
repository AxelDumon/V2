import express from "express";
import { agent } from "../app.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  return res.json({
    status: "ok",
    name: agent.name,
    lastSeen: Date.now(),
  });
});

export default router;
