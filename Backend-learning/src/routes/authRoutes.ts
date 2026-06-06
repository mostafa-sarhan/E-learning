import express from "express";
import { login, createUser, getUsers, updateUserRole, deleteUser, createStudentAccount, getStudentAccounts } from "../controllers/authController";

const router = express.Router();

router.post("/login", login);
router.post("/users", createUser);
router.get("/users", getUsers);
router.get("/students/accounts", getStudentAccounts);
router.put("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);
router.post("/students/account", createStudentAccount);

export default router;
