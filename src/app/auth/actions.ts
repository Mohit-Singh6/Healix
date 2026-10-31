"use server";

import { signIn, signOut } from "@/src/auth";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logOut() {
  await signOut({ redirectTo: "/" });
}
