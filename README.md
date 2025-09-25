# Test Stripe Checkout Session Integration

### 1. Initialize local DB and run the server
In backend root:
`yarn prisma migrate dev --name init`
then
`yarn dev`

Prisma reads DATABASE_URL and creates dev.db (SQLite). Your API is now live on port 3001

### 2. Start the Stripe webhook listener
In backend root open a new terminal and run:
`stripe listen --forward-to localhost:3001/api/stripe/webhook`

### 3. Restart the server 
`yarn dev`
This tunnels Stripe test events to your local endpoint and lets your server verify the signature

### 4. Create a checkout session (simulate the frontend)
```
curl -X POST http://localhost:3001/api/checkout/sessions \
  -H 'Content-Type: application/json' \
  -H 'x-idempotency-key: test-123' \
  -d '{
    "planId": "6w",
    "acceptedTos": true,
    "acceptedDisclosure": true,
    "marketingOptIn": false,
    "disclosureVersion": "v1.0"
  }'
```

You’ll get back {"url":"https://checkout.stripe.com/..."} — open that URL, pay with a test card (4242 4242 4242 4242, any future exp, any CVC).
Why: this calls your POST /api/checkout/sessions which validates input (Zod), maps planId → Price ID, and creates a Checkout Session.
