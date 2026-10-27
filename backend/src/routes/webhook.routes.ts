
import { Router } from "express";
import { cashfreeWebhookController } from "../controllers/webhook.controller.js";

const router = Router();

router.post("/cashfree", cashfreeWebhookController);

export default router;
