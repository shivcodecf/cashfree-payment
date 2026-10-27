
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000,
  },
});

prisma.$connect()
  .then(() => console.log("Database connected successfully"))
  .catch((error) => console.error("Database connection failed:", error));

export default prisma;
