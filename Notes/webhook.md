

# DOCS: https://docs.github.com/en/webhooks/about-webhooks


A **webhook** is an automated, event-driven HTTP request (usually a `POST`) sent from one application to another the moment a specific event occurs. It is often described as a "reverse API" or a "push notification for servers."

In a traditional API, your application asks another server: *"Did anything happen yet?"* (polling). With a webhook, your application tells the provider: *"Here is my URL—call me the second something happens."*

---

### How a Webhook Works

1. **Setup:** You create a public endpoint on your server (e.g., `[https://myapp.com/api/webhooks/payment](https://myapp.com/api/webhooks/payment)`).
2. **Registration:** You give that URL to an external service (like Stripe, GitHub, or Shopify) and choose which events you care about.
3. **Trigger:** An event happens on the external service (e.g., a customer completes checkout).
4. **Delivery:** The service immediately fires an HTTP `POST` request containing a JSON payload with event details to your URL.
5. **Action:** Your server receives the payload, verifies it, processes the data (updates a database, sends an email), and returns an HTTP `200 OK`.

---

### What Is It Used For?

Webhooks are used anywhere systems need to react to external actions in **real time** without wasteful background polling. Common real-world examples:

* **Payment Processing (Stripe, Razorpay, PayPal):**
* When a customer's asynchronous payment succeeds or fails, Stripe sends a `payment_intent.succeeded` webhook so your backend can activate their subscription or unlock access.


* **CI/CD & Developer Automation (GitHub, GitLab):**
* When you push code or open a PR, GitHub fires a webhook to Vercel, AWS, or Jenkins to trigger an automated build, test suite, and preview deployment.



---

### Regular API vs. Webhook

| Feature | Regular API (Polling) | Webhook (Push) |
| --- | --- | --- |
| **Communication** | Client requests data from server | Server pushes data to client endpoint |
| **Timing** | Scheduled or on-demand | Instant (event-driven) |
| **Efficiency** | High resource waste (mostly empty responses) | Low overhead (fires only when an event occurs) |
| **Who initiates?** | Your application | The external provider |

---

# Can i only track or subscribe to links that are on github or other custom url's too or a project deployed on vercel, how will they return data? in webhooks? How can i make my user of my website, make him to return data about his deployed website at a specific event to a url of my website

- Yes, you can track any URL you want, whether it is on GitHub, a project deployed on Vercel, or a completely custom domain!
- When a crash or error occurs, they all return data using Webhooks via HTTP POST requests, but how the data gets generated depends on the system.

Other projects send data to your tool using an **HTTP Webhook Ingestion API**.

Yes, users have to add a tiny integration step to their project (typically taking less than 2 minutes), exactly like setting up Sentry, Datadog, or LogRocket.

Here is how it works, what the user has to do, and the options available:

---

### 1. What the User Gets From Your Dashboard

When a user creates a project on your platform, your system generates two things:

1. **An Ingestion Endpoint**:
`[https://your-app.com/api/v1/ingest](https://your-app.com/api/v1/ingest)`
2. **A Unique Project API Key**:
`proj_live_8f3a1290bc...`

---

### 2. The Minimal Extra Step Users Must Do

Depending on what kind of app they run, users set up error reporting using one of three standard patterns:

#### Option A: 5-Line Global Error Middleware (For Node.js / Express / Next.js)

The user adds a helper inside their app's global error handler or `catch` block that fires an asynchronous HTTP `POST` request without blocking their response:

```ts
// Inside the user's Express / Next.js backend error middleware:
app.use((err, req, res, next) => {
  // Fire-and-forget telemetry report to your tool
  fetch('https://your-app.com/api/v1/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.AUTO_SRE_API_KEY!, // Their project API key
    },
    body: JSON.stringify({
      serviceName: 'order-service',
      message: err.message,
      stackTrace: err.stack,
      statusCode: 500,
      endpoint: req.originalUrl,
    }),
  }).catch(() => {}); // Fails silently so it never breaks the user's app

  res.status(500).json({ error: 'Internal Server Error' });
});

```

#### Option B: Forwarding from Sentry / Datadog (Zero Code Changes)

If the user already uses Sentry or Datadog, they write **zero code**:

1. They go to Sentry $\rightarrow$ **Settings** $\rightarrow$ **Integrations** $\rightarrow$ **Webhooks**.
2. They paste your ingestion URL: `[https://your-app.com/api/v1/ingest?apiKey=proj_live](https://your-app.com/api/v1/ingest?apiKey=proj_live)_...`
3. Whenever Sentry detects a 500 error, Sentry's servers automatically forward the error payload to your API.

#### Option C: A 1-Line Custom SDK / npm Package (What Makes It Look Pro)

If you want to make it feel like a commercial SaaS on your resume, you can package that small fetch snippet into a lightweight npm utility (`@yourbrand/sdk`):

```ts
import { initIncidentReporter } from '@yourbrand/sdk';

initIncidentReporter({
  apiKey: process.env.AUTO_SRE_API_KEY,
  serviceName: 'checkout-service',
});

```

This SDK hooks into Node's `process.on('uncaughtException')` and `process.on('unhandledRejection')` to auto-capture unhandled crashes with zero manual middleware wiring.

---

### 3. How Your Ingestion Route Handles It

When the user's app sends the JSON payload:

```json
{
  "serviceName": "billing-api",
  "message": "Cannot read properties of undefined (reading 'customer_id')",
  "stackTrace": "TypeError: Cannot read properties of undefined...\n at processPayment (src/services/billing.ts:48:21)...",
  "statusCode": 500,
  "endpoint": "/api/v1/charge"
}

```

1. **Authentication**: Your API route verifies `x-api-key` against the `Project` table in PostgreSQL.
2. **Enqueue**: It pushes the raw payload onto your **BullMQ Redis Queue** and immediately responds with `202 Accepted` (<10ms response time).
3. **Background Worker**: BullMQ picks up the job, embeds the stack trace using `text-embedding-004`, runs the `pgvector` similarity deduplication check, and decides whether to increment an existing incident counter or wake up the LangGraph triage agent.