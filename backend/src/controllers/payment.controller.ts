import type { Request, Response } from "express";
import { z } from "zod";
import { createPayment } from "../services/payment.service";
import { validate as isValidUUID } from "uuid";
import { getPaymentById } from "../services/payment.service";

const createPaymentSchema = z.object({
  studentId: z.string().trim().min(1).max(100),
  amount: z.number().positive().finite().max(10_000_000),
});

export async function createPaymentController(req: Request, res: Response) {
  const parsed = createPaymentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment request",
      errors: parsed.error.issues,
    });
  }

  try {
    const payment = await createPayment(parsed.data);

    return res.status(201).json({
      success: true,
      message: "Cashfree order created",
      data: {
        id: payment.id,
        studentId: payment.studentId,
        orderId: payment.orderId,
        cashfreeOrderId: payment.cashfreeOrderId,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: payment.status,
        paymentSessionId: payment.paymentSessionId,
      },
    });
  } catch (error) {
    console.error("Payment creation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create payment",
    });
  }
}



export async function getPaymentController(
  req: Request,
  res: Response,
) {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment ID",
    });
  }

  try {
    const payment = await getPaymentById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: payment.id,
        studentId: payment.studentId,
        orderId: payment.orderId,
        cashfreeOrderId: payment.cashfreeOrderId,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get payment failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment",
    });
  }
}
