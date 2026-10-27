
import { Prisma, PaymentStatus } from "../generated/prisma/client";
import prisma from "../lib/prisma";
import { cashfree } from "../lib/cashfree";

export function verifyCashfreeWebhook(
  signature: string,
  rawBody: string,
  timestamp: string,
) {
  return cashfree.PGVerifyWebhookSignature(
    signature,
    rawBody,
    timestamp,
  );
}

type CashfreeEvent = {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
    };
  };
};

export async function processCashfreeWebhook(event: CashfreeEvent) {
  const eventType = event.type;
  const orderId = event.data?.order?.order_id;
  const paymentData = event.data?.payment;
  const paymentStatus = paymentData?.payment_status;
  const cfPaymentId = paymentData?.cf_payment_id;

  if (!eventType || !orderId || !paymentStatus || cfPaymentId == null) {
    throw new Error("Invalid or incomplete Cashfree payment event");
  }

  const statusMap: Record<string, PaymentStatus | undefined> = {
    SUCCESS: PaymentStatus.SUCCESS,
    FAILED: PaymentStatus.FAILED,
    USER_DROPPED: PaymentStatus.CANCELLED,
  };

  const newStatus = statusMap[paymentStatus];

  if (!newStatus) {
    // For example, a pending event should not mark a payment as final.
    return { ignored: true, reason: "Non-final payment status" };
  }

  const eventKey = `${eventType}:${cfPaymentId}`;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new Error("Payment record not found for Cashfree order");
    }

    // A successful payment must never be downgraded by a later failure event.
    const nextStatus =
      payment.status === PaymentStatus.SUCCESS
        ? PaymentStatus.SUCCESS
        : newStatus;

    await tx.webhookEvent.create({
      data: {
        eventKey,
        eventType,
        processingStatus: "PROCESSING",
        paymentId: payment.id,
      },
    });

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        cashfreePaymentId: String(cfPaymentId),
      },
    });

    await tx.webhookEvent.update({
      where: { eventKey },
      data: {
        processingStatus: "PROCESSED",
        processedAt: new Date(),
      },
    });

    return { ignored: false, payment: updatedPayment };
  }).catch((error: unknown) => {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ignored: true, reason: "Duplicate webhook event" };
    }

    throw error;
  });
}
