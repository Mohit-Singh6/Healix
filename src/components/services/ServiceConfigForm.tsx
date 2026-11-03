"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, LoaderCircle, Plus, RotateCw } from "lucide-react";
import { createService } from "@/src/app/dashboard/actions";

type DeploymentProvider = "NONE" | "VERCEL" | "RENDER" | "CUSTOM";

const fieldClassName =
  "w-full rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 font-mono text-sm text-[#EDEDE8] outline-none placeholder:text-[#66665F] focus:border-[#F59E0B]";

function FormField({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
  readOnly = false,
  helper,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-[#D4D4CE]">
      {label}
      <input
        className={`${fieldClassName} ${readOnly ? "cursor-not-allowed text-[#8E8E86] opacity-70" : ""}`}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        type={type}
        required={required}
        readOnly={readOnly}
        autoComplete={type === "password" ? "new-password" : undefined}
      />
      {helper && <span className="text-xs leading-relaxed text-[#8E8E86]">{helper}</span>}
    </label>
  );
}

export default function ServiceConfigForm({
  installationId,
  owner,
  repo,
  branch,
  initialResult = null,
}: {
  installationId: string;
  owner: string;
  repo: string;
  branch: string;
  initialResult?: {
    serviceId: string;
    serviceName: string;
    webhookUrl: string;
    prUrl: string | null;
    prStatus: string | null;
  } | null;
}) {
  const [deploymentProvider, setDeploymentProvider] = useState<DeploymentProvider>("NONE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<{
    serviceId: string;
    serviceName: string;
    webhookUrl: string;
  } | null>(null);
  const [generatedPrUrl, setGeneratedPrUrl] = useState<string | null>(null);
  const [isGeneratingPr, setIsGeneratingPr] = useState(false);
  const [prError, setPrError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const displayedResult = result ?? initialResult;
  const displayedPrUrl = generatedPrUrl ?? initialResult?.prUrl ?? null;

  async function submitService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await createService(new FormData(event.currentTarget));
      if (!response.success) {
        setFormError(response.error);
        return;
      }

      setResult({
        serviceId: response.service.id,
        serviceName: response.service.name,
        webhookUrl: new URL(response.webhookUrl, window.location.origin).toString(),
      });
    } catch (error) {
      console.error("Service registration request failed.", error);
      setFormError("Service registration failed unexpectedly. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function autoSetupErrorTracking() {
    if (!displayedResult || isGeneratingPr) return;
    setIsGeneratingPr(true);
    setPrError("");

    try {
      const response = await fetch(`/api/services/${encodeURIComponent(displayedResult.serviceId)}/auto-instrument`, {
        method: "POST",
      });
      const data: { success?: boolean; prUrl?: string; error?: string } = await response.json();
      if (!response.ok || !data.success || !data.prUrl) {
        throw new Error(data.error ?? "Could not create the pull request. Try again.");
      }
      setGeneratedPrUrl(data.prUrl);
    } catch (error) {
      console.error("Automatic error-tracking setup failed.", error);
      setPrError(error instanceof Error ? error.message : "Could not create the pull request. Try again.");
    } finally {
      setIsGeneratingPr(false);
    }
  }

  if (displayedResult) {
    return (
      <section className="mt-8 rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-6">
        <p className="font-mono text-xs tracking-widest text-[#10B981]">SERVICE CONNECTED</p>
        <h2 className="mt-2 text-xl font-semibold text-[#EDEDE8]">{displayedResult.serviceName}</h2>
        <p className="mt-2 text-sm text-[#A1A19A]">Copy this ingestion endpoint into your alert source.</p>
        <code className="mt-4 block break-all rounded border border-[#2B2A24] bg-[#121211] p-3 font-mono text-sm text-[#D4D4CE]">
          {displayedResult.webhookUrl}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(displayedResult.webhookUrl);
              setCopyMessage("Webhook URL copied.");
            } catch (error) {
              console.error("Unable to copy the service webhook URL.", error);
              setCopyMessage("Could not copy the webhook URL. Select and copy it manually.");
            }
          }}
          className="mt-4 inline-flex items-center gap-2 rounded bg-[#F59E0B] px-4 py-2 font-mono text-sm font-medium text-black hover:bg-[#D97706]"
        >
          <Copy aria-hidden="true" size={15} /> Copy webhook URL
        </button>
        <p aria-live="polite" className="mt-2 min-h-4 font-mono text-xs text-[#8E8E86]">{copyMessage}</p>
        <div className="my-5 flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-[#6E6E68]">
          <span className="h-px flex-1 bg-[#2B2A24]" />
          <span>OR</span>
          <span className="h-px flex-1 bg-[#2B2A24]" />
        </div>
        <p className="text-sm leading-relaxed text-[#A1A19A]">
          Automatically creates a pull request on your repository with a lightweight, zero-dependency reporter for uncaught frontend and backend errors.
        </p>
        {displayedPrUrl ? (
          <div className="mt-4 rounded border border-emerald-900/50 bg-emerald-950/20 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <CheckCircle2 aria-hidden="true" size={16} />
              Pull request generated successfully!
            </p>
            <a
              href={displayedPrUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm text-[#F59E0B] hover:text-[#FDBA32]"
            >
              View &amp; Merge Pull Request on GitHub <ExternalLink aria-hidden="true" size={14} />
            </a>
            <p className="mt-2 text-xs leading-relaxed text-[#A1A19A]">
              Merge this pull request to complete error monitoring integration with your service.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void autoSetupErrorTracking()}
              disabled={isGeneratingPr}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 font-mono text-sm font-medium text-black transition-colors hover:bg-[#D97706] disabled:cursor-wait disabled:opacity-70"
            >
              {isGeneratingPr ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
                  Creating branch and generating pull request...
                </>
              ) : (
                "Auto-Setup Error Tracking"
              )}
            </button>
            {isGeneratingPr && (
              <p className="mt-2 text-xs text-[#8E8E86]">This usually takes a few seconds.</p>
            )}
            {prError && (
              <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
                <span>{prError}</span>
                <button
                  type="button"
                  onClick={() => void autoSetupErrorTracking()}
                  disabled={isGeneratingPr}
                  className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs text-rose-200 underline hover:text-white disabled:opacity-50"
                >
                  <RotateCw aria-hidden="true" size={13} /> Retry
                </button>
              </div>
            )}
          </div>
        )}
        {formError && <p role="alert" className="mt-3 text-sm text-rose-300">{formError}</p>}
        <Link href="/services" className="ml-4 font-mono text-sm text-[#A1A19A] hover:text-[#EDEDE8]">
          View services
        </Link>
      </section>
    );
  }

  return (
    <form className="mt-8 flex flex-col gap-5 rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-6" onSubmit={submitService}>
      <input type="hidden" name="githubInstallationId" value={installationId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Service name" name="name" defaultValue={repo} required />
        <FormField label="Repository owner" name="repoOwner" defaultValue={owner} readOnly required />
        <FormField label="Repository name" name="repoName" defaultValue={repo} readOnly required />
        <FormField label="Default branch" name="defaultBranch" defaultValue={branch} readOnly required />
      </div>

      <div className="grid gap-4 border-t border-[#2B2A24] pt-5 sm:grid-cols-2">
        <FormField label="Deployed URL (optional)" name="deployedUrl" type="url" placeholder="https://api.yourdomain.com" />
        <label className="flex flex-col gap-1.5 text-sm text-[#D4D4CE]">
          Runtime configuration provider
          <select
            name="deploymentProvider"
            value={deploymentProvider}
            onChange={(event) => setDeploymentProvider(event.target.value as DeploymentProvider)}
            className={fieldClassName}
          >
            <option value="NONE">None</option>
            <option value="VERCEL">Vercel</option>
            <option value="RENDER">Render</option>
            <option value="CUSTOM">Custom webhook</option>
          </select>
        </label>
      </div>

      {deploymentProvider === "VERCEL" && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Vercel resource ID"
              name="platformServiceId"
              placeholder="prj_xxxxxxxxxxxxxxxxxxxx"
              required
              helper="Found in Vercel resource settings → General."
            />
            <FormField
              label="Vercel Access Token"
              name="platformApiToken"
              type="password"
              required
              helper="Generated under Vercel Account Settings → Tokens."
            />
            <FormField
              label="Vercel Team ID (optional)"
              name="platformTeamId"
              placeholder="team_xxxxxxxxxxxxxxxxxxxx"
              helper="Leave blank for a personal account."
            />
          </div>
          <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
            Healix will use this Vercel connection only for approved runtime configuration patches.
          </p>
        </div>
      )}
      {deploymentProvider === "RENDER" && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Render Service ID"
              name="platformServiceId"
              placeholder="srv-xxxxxxxxxxxxxxxxxxxx"
              required
              helper="Found in the URL of your Render service dashboard."
            />
            <FormField
              label="Render API Key"
              name="platformApiToken"
              type="password"
              required
              helper="Generated under Render Account Settings → API Keys."
            />
          </div>
          <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
            Healix will use this Render connection only for approved runtime configuration patches.
          </p>
        </div>
      )}
      {deploymentProvider === "NONE" && (
        <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
          Healix will handle automated code fixes and revert PRs on GitHub. Automated runtime configuration patching will be skipped.
        </p>
      )}
      {deploymentProvider === "CUSTOM" && (
        <div className="flex flex-col gap-4">
          <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
            Healix will send signed requests to this endpoint when approved runtime configuration patches are needed.
          </p>
          <FormField
            label="Custom webhook URL"
            name="customWebhookUrl"
            type="url"
            placeholder="https://infra.yourcompany.com/api/healix-patch"
            required
            helper="Requests include configKey and configValue and use an HMAC-SHA256 signature."
          />
        </div>
      )}

      {formError && (
        <p role="alert" className="rounded border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded bg-[#F59E0B] px-4 font-mono text-sm font-medium text-black transition-colors hover:bg-[#D97706] disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? "Registering service..." : "Create Service"}
        {!isSubmitting && <Plus aria-hidden="true" size={16} />}
      </button>
    </form>
  );
}
