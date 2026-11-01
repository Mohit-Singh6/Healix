import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/auth";
import { resumeTriage } from "@/src/agent/resumeTriage";
import { prisma } from "@/src/lib/prisma";
import { getUserIncident } from "@/src/lib/incidents";

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  feedback: z.string().trim().max(2000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let incidentId: string;
  try {
    ({ id: incidentId } = await params);
  } catch {
    return NextResponse.json({ error: "Incident ID is invalid." }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = decisionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Select a valid incident decision." },
      { status: 422 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User account not found." }, { status: 404 });

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, project: { is: { userId: user.id } } },
      select: { id: true, threadId: true, status: true, humanApprovalStatus: true },
    });
    if (!incident) return NextResponse.json({ error: "Incident not found." }, { status: 404 });
    if (incident.status !== "PENDING_APPROVAL" || incident.humanApprovalStatus !== "PENDING") {
      return NextResponse.json({ error: "This incident is no longer awaiting operator approval." }, { status: 409 });
    }

    if (!incident.threadId) {
      return NextResponse.json({ error: "The incident has no resumable triage thread." }, { status: 409 });
    }

    const threadId = incident.threadId;
    const decidedAt = new Date();
    const operatorFeedback = parsed.data.feedback ||
      (parsed.data.status === "APPROVED" ? "Approved by operator." : "Rejected by operator.");
    const claim = await prisma.incident.updateMany({
      where: {
        id: incident.id,
        project: { is: { userId: user.id } },
        status: "PENDING_APPROVAL",
        humanApprovalStatus: "PENDING",
      },
      data: {
        status: parsed.data.status === "APPROVED" ? "MITIGATING" : "DISMISSED",
        humanApprovalStatus: parsed.data.status,
        operatorFeedback,
        reviewedBy: email,
        decidedAt,
      },
    });
    if (claim.count !== 1) {
      return NextResponse.json({ error: "This incident has already been reviewed." }, { status: 409 });
    }

    try {
      await resumeTriage({
        incidentId: threadId,
        status: parsed.data.status,
        feedback: operatorFeedback,
        reviewedBy: email,
      });
    } catch (error) {
      console.error(`Unable to resume triage for incident ${incident.id}.`, error);
      const currentIncident = await getUserIncident(user.id, incident.id);
      return NextResponse.json(
        {
          error: "Your decision was recorded, but triage could not finish. Check the incident status before retrying.",
          incident: currentIncident,
        },
        { status: 502 },
      );
    }

    const updatedIncident = await getUserIncident(user.id, incident.id);
    if (!updatedIncident) {
      return NextResponse.json({ error: "Incident was removed after the decision completed." }, { status: 404 });
    }

    return NextResponse.json({ incident: updatedIncident });
  } catch (error) {
    console.error(`Incident decision failed for ${incidentId}.`, error);
    return NextResponse.json({ error: "Unable to record the incident decision." }, { status: 500 });
  }
}
