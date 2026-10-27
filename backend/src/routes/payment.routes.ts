
import { Router } from "express";
import { createPaymentController } from "../controllers/payment.controller";
import { getPaymentController } from "../controllers/payment.controller.js";

const router = Router();

router.post("/create", createPaymentController);
router.get("/:id", getPaymentController);

export default router;
