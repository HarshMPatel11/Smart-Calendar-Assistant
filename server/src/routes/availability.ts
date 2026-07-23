import { Router } from "express";
import { getAvailability } from "../controllers/availabilityController.js";

const router = Router();

router.get("/availability", getAvailability);

export default router;
