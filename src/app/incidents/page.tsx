import type { Metadata } from "next";
import { IncidentOverview } from "@/components/incidents/IncidentOverview";

export const metadata: Metadata = {
  title: "Incident command",
};

export default function IncidentsPage() {
  return <IncidentOverview />;
}
