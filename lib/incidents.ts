export type IncidentSeverity = "P1" | "P2" | "P3";
export type IncidentStage =
  | "AWAITING_APPROVAL"
  | "DIAGNOSING"
  | "MITIGATED";
export type ProposedAction =
  | "REVERT_PR"
  | "APPLY_CONFIG_PATCH"
  | "MANUAL_INTERVENTION"
  | "NO_ACTION";

export type DiffLine = {
  kind: "hunk" | "context" | "addition" | "deletion";
  oldLine?: number;
  newLine?: number;
  text: string;
};

export type Incident = {
  id: string;
  title: string;
  summary: string;
  service: string;
  severity: IncidentSeverity;
  stage: IncidentStage;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  endpoint: string;
  hypothesis: string;
  proposedAction: ProposedAction;
  actionReason: string;
  riskScore: number;
  commit: {
    sha: string;
    author: string;
    message: string;
    timestamp: string;
    filesChanged: string[];
    additions: number;
    deletions: number;
    diff: DiffLine[];
  };
  correlatedLogs: string[];
  stackTrace: string[];
};

export const incidents: Incident[] = [
  {
    id: "INC-4829",
    title: "Tenant context missing during checkout",
    summary: "Checkout requests fail before the order is persisted.",
    service: "checkout-api",
    severity: "P1",
    stage: "AWAITING_APPROVAL",
    occurrences: 684,
    firstSeen: "14:02:18 UTC",
    lastSeen: "14:11:42 UTC",
    endpoint: "POST /v2/checkout",
    hypothesis:
      "A recent request-context refactor stopped forwarding the tenant identifier into the checkout transaction. The new persistence path dereferences tenant metadata before validating the request, so affected checkouts terminate before an order record is created.",
    proposedAction: "REVERT_PR",
    actionReason:
      "The suspect commit is the only matching change in the 24-hour inspection window and directly removed the context fallback.",
    riskScore: 0.18,
    commit: {
      sha: "a81f2c9d4e7b",
      author: "Maya Chen",
      message: "refactor(checkout): streamline request context",
      timestamp: "Today, 13:48 UTC",
      filesChanged: ["src/checkout/context.ts", "src/checkout/submit.ts"],
      additions: 12,
      deletions: 7,
      diff: [
        { kind: "hunk", text: "@@ -41,8 +41,13 @@ resolveCheckoutContext" },
        { kind: "context", oldLine: 41, newLine: 41, text: "  const requestId = request.id;" },
        { kind: "deletion", oldLine: 42, text: "  const tenantId = request.tenant?.id ?? context.tenantId;" },
        { kind: "addition", newLine: 42, text: "  const tenantId = request.tenant.id;" },
        { kind: "context", oldLine: 43, newLine: 43, text: "  const region = context.region;" },
        { kind: "addition", newLine: 44, text: "  if (!tenantId) {" },
        { kind: "addition", newLine: 45, text: "    throw new MissingTenantContextError(requestId);" },
        { kind: "addition", newLine: 46, text: "  }" },
        { kind: "context", oldLine: 44, newLine: 47, text: "  return { requestId, tenantId, region };" },
      ],
    },
    correlatedLogs: [
      "[14:02:18.221] [INFO ] POST /v2/checkout  → request received · req_7bd19",
      "[14:02:18.224] [DEBUG] context resolver · tenant header present · x-tenant-id=tn_•••",
      "[14:02:18.226] [ERROR] checkout.submit · Cannot read properties of undefined (reading 'id')",
      "[14:02:18.229] [WARN ] transaction rolled back · order write skipped",
      "[14:03:04.017] [ERROR] POST /v2/checkout  → 500 · duration=42ms",
    ],
    stackTrace: [
      "TypeError: Cannot read properties of undefined (reading 'id')",
      "    at resolveCheckoutContext (src/checkout/context.ts:42:35)",
      "    at submitCheckout (src/checkout/submit.ts:118:21)",
      "    at processRequest (src/http/router.ts:76:14)",
      "    at async requestHandler (src/http/server.ts:209:9)",
    ],
  },
  {
    id: "INC-4812",
    title: "Payment authorization timeout spike",
    summary: "A subset of card authorizations exceed the upstream timeout.",
    service: "payments-worker",
    severity: "P2",
    stage: "DIAGNOSING",
    occurrences: 493,
    firstSeen: "13:41:06 UTC",
    lastSeen: "14:10:33 UTC",
    endpoint: "POST /internal/authorize",
    hypothesis:
      "The payment provider response time is elevated. The current trace does not show a matching application change, so the upstream dependency and timeout configuration remain under investigation.",
    proposedAction: "APPLY_CONFIG_PATCH",
    actionReason:
      "Node C recommends reviewing the provider timeout and retry budget before changing application code.",
    riskScore: 0.42,
    commit: {
      sha: "c04e719ab362",
      author: "Jon Bell",
      message: "ops(payments): tune retry telemetry",
      timestamp: "Today, 11:22 UTC",
      filesChanged: ["src/payments/provider.ts"],
      additions: 5,
      deletions: 2,
      diff: [
        { kind: "hunk", text: "@@ -84,4 +84,7 @@ authorizePayment" },
        { kind: "context", oldLine: 84, newLine: 84, text: "  const response = await provider.authorize(payload, {" },
        { kind: "deletion", oldLine: 85, text: "    timeout: 2500," },
        { kind: "addition", newLine: 85, text: "    timeout: 1800," },
        { kind: "context", oldLine: 86, newLine: 86, text: "    requestId," },
        { kind: "addition", newLine: 87, text: "    retryClass: 'interactive'," },
      ],
    },
    correlatedLogs: [
      "[13:41:06.101] [INFO ] POST /internal/authorize · provider=swiftpay",
      "[13:41:07.902] [WARN ] provider response exceeded 1800ms · attempt=1",
      "[13:41:09.714] [ERROR] authorization deadline exceeded · request=pay_•••",
    ],
    stackTrace: [
      "ProviderTimeoutError: authorization deadline exceeded",
      "    at authorizePayment (src/payments/provider.ts:86:24)",
      "    at async processPayment (src/payments/worker.ts:153:18)",
    ],
  },
  {
    id: "INC-4786",
    title: "Session refresh returns intermittent 401",
    summary: "Refresh tokens are rejected after a signing-key rotation.",
    service: "identity-edge",
    severity: "P3",
    stage: "MITIGATED",
    occurrences: 243,
    firstSeen: "12:16:51 UTC",
    lastSeen: "13:22:05 UTC",
    endpoint: "POST /v1/session/refresh",
    hypothesis:
      "A stale key cache caused a short-lived mismatch after rotation. Cache invalidation completed and the error rate has returned to baseline.",
    proposedAction: "NO_ACTION",
    actionReason:
      "The issue is currently mitigated; continue monitoring before making a code change.",
    riskScore: 0.07,
    commit: {
      sha: "f22d98eac10b",
      author: "Ravi Patel",
      message: "chore(identity): rotate signing key cache",
      timestamp: "Today, 10:54 UTC",
      filesChanged: ["src/identity/key-cache.ts"],
      additions: 3,
      deletions: 1,
      diff: [
        { kind: "hunk", text: "@@ -27,3 +27,5 @@ refreshSigningKeys" },
        { kind: "context", oldLine: 27, newLine: 27, text: "  await keyStore.refresh();" },
        { kind: "addition", newLine: 28, text: "  cache.invalidate('identity-signing-keys');" },
        { kind: "context", oldLine: 28, newLine: 29, text: "  return keyStore.activeKey();" },
      ],
    },
    correlatedLogs: [
      "[12:16:51.008] [WARN ] token verification key not found · kid=k_•••",
      "[12:18:14.610] [INFO ] key cache refresh completed · entries=3",
      "[13:22:05.901] [INFO ] refresh rejection rate returned to baseline",
    ],
    stackTrace: [
      "TokenVerificationError: no matching signing key",
      "    at verifySession (src/identity/verify.ts:61:17)",
      "    at async refreshSession (src/identity/refresh.ts:104:12)",
    ],
  },
];

export function getIncidentById(id: string) {
  return incidents.find((incident) => incident.id === id);
}

export function getStageLabel(stage: IncidentStage) {
  switch (stage) {
    case "AWAITING_APPROVAL":
      return "Awaiting approval";
    case "DIAGNOSING":
      return "Diagnosing";
    case "MITIGATED":
      return "Mitigated";
  }
}
