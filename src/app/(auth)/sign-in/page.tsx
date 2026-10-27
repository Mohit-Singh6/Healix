import type { Metadata } from "next";
import { AuthBlueprint } from "@/components/auth/AuthBlueprint";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return <AuthBlueprint mode="sign-in" />;
}
