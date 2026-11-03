export type IncidentStatus =
  | "INVESTIGATING"
  | "PENDING_APPROVAL"
  | "MITIGATING"
  | "RESOLVED"
  | "DISMISSED";

export type ProposedIncidentAction =
  | "REVERT_PR"
  | "BUGFIX_PR"
  | "APPLY_CONFIG_PATCH"
  | "MANUAL_INTERVENTION"
  | "NO_ACTION";

export interface IncidentData {
  id: string;
  displayId: string;
  title: string;
  project: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  timestamp: string;
  updatedAt: string;
  hypothesis: string;
  confidence: number | null;
  suspectCommit: {
    hash: string | null;
    author: string | null;
    time: string | null;
    file: string | null;
    functionName: string | null;
    message: string | null;
  };
  diff: {
    removed: string[];
    added: string[];
  };
  logs: string[];
  rawTrace: string;
  status: IncidentStatus;
  proposedAction: ProposedIncidentAction | null;
  humanApprovalStatus: "PENDING" | "APPROVED" | "REJECTED";
  operatorFeedback: string | null;
  reviewedBy: string | null;
  decidedAt: string | null;
  remediationPrUrl: string | null;
  actionSummary: string | null;
  postMortemMarkdown: string | null;
}

export interface DashboardIncident {
  id: string;
  displayId: string;
  severity: IncidentData["severity"];
  signature: string;
  project: string;
  volume: number;
  createdAt: string;
  status: IncidentStatus;
  proposedAction: ProposedIncidentAction | null;
  humanApprovalStatus: IncidentData["humanApprovalStatus"];
  reviewedBy: string | null;
  target: string | null;
}
