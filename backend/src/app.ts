import express from "express";
import helmet from "helmet";
import paymentRoutes from "./routes/payment.routes";
import webhookRoutes from "./routes/webhook.routes";

const app = express();

app.use(helmet());


app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody =
        buf.toString("utf8");
    },
  }),
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Cashfree UMS backend is running",
  });
});

app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);

export default app;
