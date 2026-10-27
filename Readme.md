# Cashfree Payment Integration — UMS

A backend payment integration for a University Management System (UMS), built with Node.js, Express, TypeScript, Prisma, PostgreSQL, and Cashfree Payment Gateway.

The system creates payment orders, tracks payment status, securely processes Cashfree webhooks, and maintains payment and webhook event records in the database.

## Features

- Create Cashfree payment orders through a REST API.
- Store payment details and status in PostgreSQL using Prisma ORM.
- Integrate with Cashfree Sandbox for payment testing.
- Verify Cashfree webhook signatures using the original request body.
- Process payment success, failure, and user-dropped events.
- Store webhook event records for auditability.
- Detect duplicate webhook events to avoid repeated processing.
- Retrieve payment details using the payment record ID.
- Provide a health-check endpoint.
- Use environment variables for configuration and credentials.

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Payment Gateway:** Cashfree PG
- **Validation:** Zod
- **Security Middleware:** Helmet
- **Development:** tsx
- **Webhook Testing:** ngrok and Cashfree Sandbox

## Project Structure

```text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   │   ├── payment.controller.ts
│   │   └── webhook.controller.ts
│   ├── generated/
│   │   └── prisma/
│   ├── lib/
│   │   ├── cashfree.ts
│   │   └── prisma.ts
│   ├── routes/
│   │   ├── payment.routes.ts
│   │   └── webhook.routes.ts
│   ├── services/
│   │   ├── payment.service.ts
│   │   └── webhook.service.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── README.md
```

## Prerequisites

Before running the project, install:

- Node.js and npm
- A Supabase PostgreSQL project or another compatible PostgreSQL database
- Cashfree Sandbox account and API credentials
- Postman (for API testing)
- ngrok (for receiving webhooks locally)

## Installation

Clone the repository and enter the backend directory:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd backend
npm install
```

Create a `.env` file in the backend directory.

### Environment Variables

Configure the following variables in `.env`:

```env
PORT=9000
DATABASE_URL="YOUR_POSTGRESQL_CONNECTION_STRING"

CASHFREE_APP_ID="YOUR_CASHFREE_SANDBOX_APP_ID"
CASHFREE_SECRET_KEY="YOUR_CASHFREE_SANDBOX_SECRET_KEY"
CASHFREE_ENV="SANDBOX"

RETURN_URL="http://localhost:9000/api/payments/return"
CASHFREE_WEBHOOK_URL="https://YOUR_NGROK_DOMAIN/api/webhooks/cashfree"
```

**Important:** Replace the example values with your own configuration. Never commit `.env` or expose your database password, Cashfree secret key, or other credentials.

The return URL above is a configuration example. Ensure a matching return route is implemented before relying on it; browser redirects and webhook processing are separate flows.

## Database Setup

Generate the Prisma client:

```bash
npx prisma generate
```

Apply database migrations:

```bash
npx prisma migrate deploy
```

For local development, if you need to create a new migration after changing the Prisma schema:

```bash
npx prisma migrate dev --name describe_your_change
```

The application uses Prisma to access the PostgreSQL database.

### Data Models

#### Payment

Stores payment information, including:

- Payment record ID
- Student ID
- Internal order ID
- Cashfree order ID
- Amount and currency
- Payment status
- Cashfree payment ID
- Creation and update timestamps

Payment statuses:

- `PENDING`
- `SUCCESS`
- `FAILED`
- `CANCELLED`

#### WebhookEvent

Stores webhook processing information, including:

- Unique event key
- Event type
- Processing status
- Received and processed timestamps
- Related payment record, when available

Processing statuses include `RECEIVED`, `PROCESSING`, and `PROCESSED`.

## Running the Application

Start the development server:

```bash
npm run dev
```

The server runs on port `9000` by default when configured as above.

### Health Check

**Endpoint:** `GET /health`

```bash
curl http://localhost:9000/health
```

Expected response:

```json
{
  "success": true,
  "message": "Cashfree UMS backend is running"
}
```

## API Endpoints

### 1. Create Payment

**Endpoint:** `POST /api/payments/create`

Creates a payment record and initiates a Cashfree order.

Request body:

```json
{
  "studentId": "STU103",
  "amount": 5000
}
```

Example response structure:

```json
{
  "success": true,
  "message": "Cashfree order created",
  "data": {
    "id": "<payment-record-uuid>",
    "studentId": "STU103",
    "orderId": "<internal-order-id>",
    "cashfreeOrderId": "<cashfree-order-id>",
    "amount": "5000",
    "currency": "INR",
    "status": "PENDING",
    "paymentSessionId": "<cashfree-payment-session-id>"
  }
}
```

The actual response may contain additional fields depending on the controller implementation.

The `paymentSessionId` is used to launch Cashfree Checkout. Creating an order does not mean the payment has succeeded.

### 2. Get Payment by ID

**Endpoint:** `GET /api/payments/:id`

Retrieves a payment using the internal payment record UUID.

Example:

```bash
curl http://localhost:9000/api/payments/<payment-record-uuid>
```

### 3. Cashfree Webhook

**Endpoint:** `POST /api/webhooks/cashfree`

Cashfree sends payment event notifications to this endpoint.

The backend:

1. Reads the webhook signature and timestamp from the request headers.
2. Preserves the original request body.
3. Verifies the webhook signature using the Cashfree SDK.
4. Identifies the payment associated with the Cashfree order.
5. Records the webhook event.
6. Updates the payment status.
7. Handles duplicate events using a unique event key.

The webhook route must use the raw request body for signature verification. Express JSON middleware should capture it before the webhook route is registered.

### Payment Status Mapping

| Cashfree payment status | Internal status |
|---|---|
| `SUCCESS` | `SUCCESS` |
| `FAILED` | `FAILED` |
| `USER_DROPPED` | `CANCELLED` |
| Non-final or unknown status | No final status update |

The final mapping depends on the event payload and the service implementation.

## Testing with Postman

### Create a payment

1. Start the backend.
2. Create a `POST` request to `http://localhost:9000/api/payments/create`.
3. Select **Body → raw → JSON**.
4. Submit a valid `studentId` and `amount`.
5. Copy the returned `paymentSessionId`.

### Complete a sandbox payment

1. Open Cashfree Checkout using the returned session ID.
2. Complete the simulated payment.
3. Test success, failure, and user-dropped outcomes where supported by the sandbox.
4. Inspect webhook requests and responses through ngrok.
5. Verify the payment status and webhook event in Supabase.

### Testing webhooks locally

Start ngrok:

```bash
ngrok http 9000
```

Configure `CASHFREE_WEBHOOK_URL` with the generated HTTPS URL:

```text
https://YOUR_NGROK_DOMAIN/api/webhooks/cashfree
```

Ensure that the URL supplied when creating Cashfree orders points to the active ngrok tunnel.

Keep the backend and ngrok processes running while testing. Free ngrok URLs may change when a tunnel restarts.

## Security Considerations

- Store API credentials in environment variables.
- Never expose the Cashfree secret key to the frontend.
- Verify webhook signatures before processing events.
- Preserve the original request body for signature verification.
- Use unique constraints to help prevent duplicate webhook processing.
- Validate incoming request payloads.
- Apply appropriate authentication and authorization to payment APIs before production deployment.
- Secure database access and enable appropriate access controls.
- Use HTTPS in deployed environments.
- Review transaction status transitions to prevent invalid status changes from late or out-of-order events.

## Build

Compile the TypeScript application:

```bash
npm run build
```

Start the compiled application, if the `start` script is configured:

```bash
npm start
```

## Known Limitations and Future Improvements

- Add authentication and authorization for payment retrieval and other sensitive endpoints.
- Implement and test a complete return/redirect flow.
- Add automated tests for payment creation, webhook signature verification, duplicate events, and status transitions.
- Verify all payment outcomes with Cashfree Sandbox.
- Add structured logging, retry monitoring, and operational alerts.
- Harden transaction handling and payment status transitions for concurrent or out-of-order webhook events.
- Configure production deployment, HTTPS, and production Cashfree credentials securely.

## License

This project was created as a backend payment integration assessment.
