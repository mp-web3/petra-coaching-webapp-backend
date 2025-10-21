import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { z } from 'zod';
import { planSlugToPriceId } from './plans';

const app = express();

const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY);

app.use(cors({ origin: FRONTEND_URL, credentials: true }));

const CreateSessionBody = z.object({
    planId: z.string().min(1),
    acceptedTos: z.literal(true),
    marketingOptIn: z.boolean().optional(),
    disclosureVersion: z.string().min(1),
    email: z.email()
});

// Stripe webhook must receive the raw body BEFORE json parser
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
        return res.status(400).send('Missing signature');
    }
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch {
        return res.status(400).send('Invalid signature');
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            // TODO: persist order, consents, and provision access
            break;
        }
        case 'payment_intent.succeeded': {
            // Optional for mode=payment
            break;
        }
        default:
            break;
    }

    res.json({ received: true });
});

// JSON parser applied after webhook route
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
});

app.post('/api/checkout/sessions', async (req: Request, res: Response) => {
    const parse = CreateSessionBody.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Invalid request', details: parse.error.flatten() });
    }

    const { planId, marketingOptIn, disclosureVersion, email } = parse.data;
    const priceId = planSlugToPriceId[planId];
    console.log('CheckoutSession request →', { planId, priceId });
    if (!priceId) {
        return res.status(400).json({ error: 'Unknown planId' });
    }

    try {
        const session = await stripe.checkout.sessions.create(
            {
                mode: 'subscription',
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                ...(email ? {customer_email: email} : {}),
                custom_fields: [
                    {
                        key: 'full_name',
                        label: { type:'custom', custom: 'Full name'},
                        type: 'text',
                        optional: false
                    }
                ],
                // consent_collection: { terms_of_service: 'required' },
                success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${FRONTEND_URL}/checkout/cancel`,
                metadata: {
                    planId,
                    marketingOptIn: marketingOptIn ? 'true' : 'false',
                },
            },
            {
                idempotencyKey: (req.header('x-idempotency-key') as string) || undefined,
            }
        );

        return res.json({ url: session.url });
    } catch (err) {
        const e = err as any;
        console.error('Stripe error:', e?.raw ?? e);
        return res.status(500).json({ error: e?.raw?.message || e?.message || 'Failed to create session' });
    }
});

app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${PORT}`);
});


