import { Router } from "express";
import appointmentRoutes from "./appointments.js";
import availabilityRoutes from "./availability.js";
import aiRoutes from "./ai.js";
import healthRoutes from "./health.js";
import blockRoutes from "./blocks.js";

const router = Router();

router.use(healthRoutes);
router.use(appointmentRoutes);
router.use(availabilityRoutes);
router.use(aiRoutes);
router.use(blockRoutes);

export default router;
