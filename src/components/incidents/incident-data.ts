export interface IncidentData {
  id: string;
  title: string;
  service: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  timestamp: string;
  hypothesis: string;
  confidence: number;
  suspectCommit: {
    hash: string;
    author: string;
    time: string;
    file: string;
    functionName: string;
    message: string;
  };
  diff: {
    removed: string[];
    added: string[];
  };
  logs: string[];
  rawTrace: string;
  status: "INVESTIGATING" | "PENDING_APPROVAL" | "RESOLVED";
}

const knownIncidents: Record<string, IncidentData> = {
  "INC-4829": {
    id: "INC-4829",
    title: "Payment currency dereference",
    service: "Payment Gateway",
    severity: "CRITICAL",
    timestamp: "2026-10-31T08:12:14.132Z",
    hypothesis:
      "A recent change removed the fallback currency mapping from the payment intent path. When a merchant profile omits a currency, the charge handler dereferences an undefined value and returns HTTP 500.",
    confidence: 94,
    suspectCommit: {
      hash: "a81c4d2",
      author: "maya.chen",
      time: "2 hours ago",
      file: "src/payments/charge.ts",
      functionName: "createCharge",
      message: "refactor(payments): streamline currency mapping",
    },
    diff: {
      removed: ["const currency = merchant.currency ?? DEFAULT_CURRENCY;"],
      added: ["const currency = merchant.currency;"],
    },
    logs: [
      "2026-10-31T08:12:14.022Z INFO  payment.intent.received  request_id=req_9f2c amount=124.90 USD",
      "2026-10-31T08:12:14.108Z INFO  payment.provider.selected provider=atlas-pay attempt=1",
      "2026-10-31T08:12:14.131Z WARN  payment.currency.lookup merchant.currency=<undefined>",
      "2026-10-31T08:12:14.132Z ERROR payment.charge.create TypeError: Cannot read properties of undefined",
      "2026-10-31T08:12:14.146Z ERROR http.request.failed POST /v1/charges status=500 request_id=req_9f2c",
    ],
    rawTrace: `TypeError: Cannot read properties of undefined (reading 'currency')
    at createCharge (src/payments/charge.ts:47:29)
    at async processPayment (src/payments/process.ts:112:18)
    at async PaymentController.create (src/api/payment.controller.ts:68:22)
    at async requestHandler (src/http/handler.ts:31:11)

Request: POST /v1/charges
Request ID: req_9f2c
Service: payment-gateway@2.14.0
Environment: production`,
    status: "PENDING_APPROVAL",
  },
  "INC-4812": {
    id: "INC-4812",
    title: "Duplicate order key",
    service: "Orders API",
    severity: "HIGH",
    timestamp: "2026-10-31T08:00:14.132Z",
    hypothesis:
      "Concurrent order retries can reuse the same idempotency key after a retry timeout. The database rejects the duplicate write, and the request path does not currently return the existing order.",
    confidence: 88,
    suspectCommit: {
      hash: "c2d913a",
      author: "leo.patel",
      time: "5 hours ago",
      file: "src/orders/create-order.ts",
      functionName: "createOrder",
      message: "fix(orders): make idempotent retries atomic",
    },
    diff: {
      removed: ["await orderStore.create(order);"],
      added: ["await orderStore.upsert(order.idempotencyKey, order);"],
    },
    logs: [
      "2026-10-31T08:00:14.022Z INFO  order.create.received request_id=req_4ba1 retry=2",
      "2026-10-31T08:00:14.108Z INFO  order.idempotency.lookup key=ord_8c12 result=not_found",
      "2026-10-31T08:00:14.131Z WARN  order.retry.concurrent key=ord_8c12 attempts=2",
      "2026-10-31T08:00:14.132Z ERROR order.persist Unique constraint failed",
      "2026-10-31T08:00:14.146Z ERROR http.request.failed POST /v2/orders status=500 request_id=req_4ba1",
    ],
    rawTrace: `PrismaClientKnownRequestError: Unique constraint failed on the fields: (idempotencyKey)
    at createOrder (src/orders/create-order.ts:82:19)
    at async OrderService.submit (src/orders/order.service.ts:41:12)
    at async OrderController.create (src/orders/order.controller.ts:29:16)

Request: POST /v2/orders
Request ID: req_4ba1
Service: orders-api@1.8.3
Environment: production`,
    status: "PENDING_APPROVAL",
  },
  "INC-4786": {
    id: "INC-4786",
    title: "Identity provider timeout",
    service: "Auth Microservice",
    severity: "HIGH",
    timestamp: "2026-10-31T07:36:14.132Z",
    hypothesis:
      "The upstream identity provider is exceeding the configured request deadline during token introspection. The current retry path holds connections open and amplifies the latency spike.",
    confidence: 81,
    suspectCommit: {
      hash: "e67ab10",
      author: "nora.kim",
      time: "1 day ago",
      file: "src/auth/provider-client.ts",
      functionName: "introspect",
      message: "fix(auth): bound identity provider latency",
    },
    diff: {
      removed: ["timeout: 30000,"],
      added: ["timeout: 5000,"],
    },
    logs: [
      "2026-10-31T07:36:14.022Z INFO  auth.token.received request_id=req_2c81 provider=identity",
      "2026-10-31T07:36:14.108Z INFO  auth.introspection.started attempt=1",
      "2026-10-31T07:36:14.131Z WARN  auth.provider.latency elapsed_ms=5001",
      "2026-10-31T07:36:14.132Z ERROR auth.provider.timeout ETIMEDOUT upstream identity provider",
      "2026-10-31T07:36:14.146Z ERROR http.request.failed POST /oauth/introspect status=504 request_id=req_2c81",
    ],
    rawTrace: `Error: ETIMEDOUT: upstream identity provider
    at ProviderClient.introspect (src/auth/provider-client.ts:104:13)
    at async AuthService.validateToken (src/auth/auth.service.ts:67:20)
    at async AuthController.authenticate (src/auth/auth.controller.ts:38:18)

Request: POST /oauth/introspect
Request ID: req_2c81
Service: auth-service@3.2.1
Environment: production`,
    status: "INVESTIGATING",
  },
};

export function getMockIncidentData(id: string): IncidentData {
  const knownIncident = knownIncidents[id];
  if (knownIncident) return knownIncident;

  return {
    ...knownIncidents["INC-4829"],
    id,
    title: "Unhandled service exception",
  };
}
