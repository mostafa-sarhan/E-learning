import express from "express";
import { getSessions, createSession, updateSession, deleteSession } from "../controllers/sessionController";

const router = express.Router();

router.get("/", getSessions);
router.post("/", createSession);
router.put("/:id", updateSession);
router.delete("/:id", deleteSession);

export default router;
