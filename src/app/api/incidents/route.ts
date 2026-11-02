import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { listUserIncidents } from "@/src/lib/incidents";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User account not found." }, { status: 404 });

    return NextResponse.json({ incidents: await listUserIncidents(user.id) });
  } catch (error) {
    console.error("Unable to load incidents for the authenticated user.", error);
    return NextResponse.json({ error: "Unable to load incidents." }, { status: 500 });
  }
}