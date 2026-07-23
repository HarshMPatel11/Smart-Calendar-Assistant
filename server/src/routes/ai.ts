import { Router } from "express";
import { chat } from "../controllers/aiController.js";

const router = Router();

router.post("/ai/chat", chat);

export default router;
