"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Code2, LockKeyhole, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AuthBlueprintProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthBlueprint({ mode }: AuthBlueprintProps) {
  const [previewMessage, setPreviewMessage] = useState("");
  const isSignUp = mode === "sign-up";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewMessage("Email authentication is a developer-preview placeholder.");
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.06] blur-[110px]"
      />
      <section className="relative w-full max-w-[440px]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.08] shadow-[0_0_28px_rgba(6,182,212,0.12)]">
            <LockKeyhole className="size-5 text-cyan-300" />
          </div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Healix operator access
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            {isSignUp ? "Create your workspace" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isSignUp
              ? "Connect your team to a calmer incident response."
              : "Sign in to continue to incident command."}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-[#0d1527]/85 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-md sm:p-7">
          <div className="mb-5 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-white/10 bg-white/[0.025] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]"
              onClick={() =>
                setPreviewMessage("GitHub sign-in is a developer-preview placeholder.")
              }
            >
              <Code2 data-icon="inline-start" />
              GitHub
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-white/10 bg-white/[0.025] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]"
              onClick={() =>
                setPreviewMessage("Google sign-in is a developer-preview placeholder.")
              }
            >
              <span
                data-icon="inline-start"
                aria-hidden="true"
                className="grid size-4 place-items-center rounded-full bg-white text-[11px] font-bold text-slate-700"
              >
                G
              </span>
              Google
            </Button>
          </div>

          <div className="relative mb-5 flex items-center justify-center">
            <span className="h-px flex-1 bg-white/[0.08]" />
            <span className="px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
              or continue with email
            </span>
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
              {isSignUp && (
                <Field>
                  <FieldLabel className="text-xs text-slate-300" htmlFor="name">
                    Full name
                  </FieldLabel>
                  <Input
                    autoComplete="name"
                    className="h-10 border-white/10 bg-[#080e1a] text-slate-100 placeholder:text-slate-600 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/15"
                    id="name"
                    name="name"
                    placeholder="Alex Morgan"
                    required
                  />
                </Field>
              )}
              <Field>
                <FieldLabel className="text-xs text-slate-300" htmlFor="email">
                  Work email
                </FieldLabel>
                <Input
                  autoComplete="email"
                  className="h-10 border-white/10 bg-[#080e1a] text-slate-100 placeholder:text-slate-600 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/15"
                  id="email"
                  name="email"
                  placeholder="you@company.com"
                  required
                  type="email"
                />
              </Field>
              <Field>
                <FieldLabel className="text-xs text-slate-300" htmlFor="password">
                  Password
                </FieldLabel>
                <Input
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="h-10 border-white/10 bg-[#080e1a] text-slate-100 placeholder:text-slate-600 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/15"
                  id="password"
                  name="password"
                  placeholder="At least 8 characters"
                  required
                  type="password"
                />
                {isSignUp && (
                  <FieldDescription className="text-[11px] text-slate-500">
                    Use at least 8 characters for your preview account.
                  </FieldDescription>
                )}
              </Field>
              <Button className="mt-1 h-10 w-full bg-cyan-400 font-semibold text-[#03151a] hover:bg-cyan-300">
                <Mail data-icon="inline-start" />
                {isSignUp ? "Create preview account" : "Continue with email"}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </FieldGroup>
          </form>

          {previewMessage && (
            <Alert className="mt-4 border-cyan-400/20 bg-cyan-400/[0.06]">
              <AlertTitle className="text-xs text-cyan-100">
                Preview only
              </AlertTitle>
              <AlertDescription className="text-xs text-slate-400">
                {previewMessage}
              </AlertDescription>
            </Alert>
          )}

          <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">
            Authentication is not connected in this preview. No credentials are
            sent or stored.
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-slate-400">
          {isSignUp ? "Already have an account?" : "New to Healix?"}{" "}
          <Link
            className="font-medium text-cyan-300 transition hover:text-cyan-200"
            href={isSignUp ? "/sign-in" : "/sign-up"}
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
