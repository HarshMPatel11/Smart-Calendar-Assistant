import { Router } from "express";
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  getAppointmentStats,
  listAppointments,
  listUpcomingAppointments,
  updateAppointment,
  updateAppointmentStatus,
} from "../controllers/appointmentController.js";

const router = Router();

router.get("/appointments", listAppointments);
router.get("/appointments/stats", getAppointmentStats);
router.get("/appointments/upcoming", listUpcomingAppointments);
router.get("/appointments/:id", getAppointment);
router.post("/appointments", createAppointment);
router.patch("/appointments/:id", updateAppointment);
router.delete("/appointments/:id", deleteAppointment);
router.patch("/appointments/:id/status", updateAppointmentStatus);

export default router;
