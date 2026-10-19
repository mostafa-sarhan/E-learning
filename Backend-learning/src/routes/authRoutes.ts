import express from "express";
import { login, createUser, getUsers, getUserRole, getUsersByRoles, updateUserRole, deleteUser, createStudentAccount, getStudentAccounts, resetStudentPassword } from "../controllers/authController";
import { guardObjectIdParams, requireAdmin, requireAuth, requireStaff } from "../middleware/auth";
import { sensitiveLimiter } from "../middleware/security";

const router = express.Router();
guardObjectIdParams(router);

router.post("/login", login);
router.post("/users", requireAuth, requireAdmin, sensitiveLimiter, createUser);
router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/users/roles", requireAuth, requireAdmin, getUsersByRoles);
router.get("/students/accounts", requireAuth, requireAdmin, getStudentAccounts);
router.get("/users/:id/role", requireAuth, requireStaff, getUserRole);
router.put("/users/:id/role", requireAuth, requireAdmin, sensitiveLimiter, updateUserRole);
router.delete("/users/:id", requireAuth, requireAdmin, sensitiveLimiter, deleteUser);
router.post("/students/account", requireAuth, requireStaff, sensitiveLimiter, createStudentAccount);
router.post("/students/:id/reset-password", requireAuth, requireAdmin, sensitiveLimiter, resetStudentPassword);

export default router;
