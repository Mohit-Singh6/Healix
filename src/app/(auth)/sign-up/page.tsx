import type { Metadata } from "next";
import { AuthBlueprint } from "@/components/auth/AuthBlueprint";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return <AuthBlueprint mode="sign-up" />;
}
