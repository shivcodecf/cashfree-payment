
import type { Request, Response } from "express";
import {
  processCashfreeWebhook,
  verifyCashfreeWebhook,
} from "../services/webhook.service";

type RawBodyRequest = Request & {
  rawBody?: string;
};

export async function cashfreeWebhookController(
  req: RawBodyRequest,
  res: Response
) {
  try {
    const signature = req.header("x-webhook-signature");
    const timestamp = req.header("x-webhook-timestamp");
    const rawBody = req.rawBody;

    if (!signature || !timestamp || rawBody === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing webhook signature, timestamp, or raw body",
        details: {
          signaturePresent: Boolean(signature),
          timestampPresent: Boolean(timestamp),
          rawBodyPresent: rawBody !== undefined,
        },
      });
    }

    const verified = verifyCashfreeWebhook(
      signature,
      rawBody,
      timestamp
    );

    const event = verified.object as {
      type?: string;
      data?: {
        order?: { order_id?: string };
        payment?: {
          cf_payment_id?: string | number;
          payment_status?: string;
        };
      };
    };

    const result = await processCashfreeWebhook(event);

    return res.status(200).json({
      success: true,
      message: "Webhook processed",
      result,
    });
  } catch (error) {
    console.error("Cashfree webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
}
