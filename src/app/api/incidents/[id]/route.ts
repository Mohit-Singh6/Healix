import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { getUserIncident } from "@/src/lib/incidents";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User account not found." }, { status: 404 });

    const { id } = await params;
    const incident = await getUserIncident(user.id, id);
    if (!incident) return NextResponse.json({ error: "Incident not found." }, { status: 404 });

    return NextResponse.json({ incident });
  } catch (error) {
    console.error("Unable to load incident details for the authenticated user.", error);
    return NextResponse.json({ error: "Unable to load incident details." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User account not found." }, { status: 404 });

    const { id } = await params;
    const result = await prisma.incident.deleteMany({
      where: { id, project: { is: { userId: user.id } } },
    });
    if (result.count !== 1) return NextResponse.json({ error: "Incident not found." }, { status: 404 });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/incidents");
    revalidatePath(`/incidents/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to delete the incident for the authenticated user.", error);
    return NextResponse.json({ error: "Unable to delete this incident." }, { status: 500 });
  }
}
