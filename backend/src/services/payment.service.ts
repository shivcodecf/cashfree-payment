import { randomUUID } from "node:crypto";
import { Prisma, PaymentStatus } from "../generated/prisma/client";
import prisma from "../lib/prisma";
import { cashfree } from "../lib/cashfree";

interface CreatePaymentInput {
  studentId: string;
  amount: number;
}

export async function createPayment(input: CreatePaymentInput) {
  const orderId = `UMS_${randomUUID().replace(/-/g, "")}`;

  // 1. Create a pending payment record in our database.
  const payment = await prisma.payment.create({
    data: {
      studentId: input.studentId,
      orderId,
      amount: new Prisma.Decimal(input.amount),
      currency: "INR",
      status: PaymentStatus.PENDING,
    },
  });

  try {
    // 2. Create the actual order through Cashfree.
    const response = await cashfree.PGCreateOrder({
      order_id: orderId,
      order_amount: input.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: input.studentId,
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${process.env.RETURN_URL}?order_id={order_id}`,
        notify_url: process.env.CASHFREE_WEBHOOK_URL,
      },
    });

    const cashfreeOrder = response.data;

    // 3. Save Cashfree's order reference in our database.
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        cashfreeOrderId: String(cashfreeOrder.cf_order_id),
      },
    });

    // 4. Return the payment record and checkout session.
    return {
      ...updatedPayment,
      paymentSessionId: cashfreeOrder.payment_session_id,
    };
  } catch (error) {
    console.error("Cashfree order creation failed:", error);

    throw new Error("Unable to initiate payment with Cashfree");
  }
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
  });
}
