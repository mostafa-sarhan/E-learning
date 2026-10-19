import express from "express";
import { getSessions, createSession, updateSession, deleteSession } from "../controllers/sessionController";
import { guardObjectIdParams } from "../middleware/auth";

const router = express.Router();
guardObjectIdParams(router);

router.get("/", getSessions);
router.post("/", createSession);
router.put("/:id", updateSession);
router.delete("/:id", deleteSession);

export default router;
