"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Copy, Plus } from "lucide-react";
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
  initialResult?: { serviceName: string; webhookUrl: string } | null;
}) {
  const [deploymentProvider, setDeploymentProvider] = useState<DeploymentProvider>("NONE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<{ serviceName: string; webhookUrl: string } | null>(null);
  const displayedResult = result ?? initialResult;

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
            } catch (error) {
              console.error("Unable to copy the service webhook URL.", error);
              setFormError("Could not copy the webhook URL. Select and copy it manually.");
            }
          }}
          className="mt-4 inline-flex items-center gap-2 rounded bg-[#F59E0B] px-4 py-2 font-mono text-sm font-medium text-black hover:bg-[#D97706]"
        >
          <Copy aria-hidden="true" size={15} /> Copy webhook URL
        </button>
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
