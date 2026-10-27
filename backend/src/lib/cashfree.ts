import "dotenv/config";
import { Cashfree } from "cashfree-pg";

const appId = process.env.CASHFREE_APP_ID;
const secretKey = process.env.CASHFREE_SECRET_KEY;

// console.log("appId",appId);

// console.log("secretKey",secretKey);

if (!appId || !secretKey) {
  throw new Error("Missing Cashfree sandbox credentials");
}

export const cashfree = new Cashfree(
  Cashfree.SANDBOX,
  appId,
  secretKey,
);