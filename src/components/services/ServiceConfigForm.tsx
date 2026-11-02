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
        className={`${fieldClassName} ${readOnly ? "cursor-not-allowed text-[#8E8E86] opacity-80" : ""}`}
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
}: {
  installationId: string;
  owner: string;
  repo: string;
  branch: string;
}) {
  const [deploymentProvider, setDeploymentProvider] = useState<DeploymentProvider>("NONE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<{ serviceName: string; webhookUrl: string } | null>(null);

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

  if (result) {
    return (
      <section className="mt-8 rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-6">
        <p className="font-mono text-xs tracking-widest text-[#10B981]">SERVICE CONNECTED</p>
        <h2 className="mt-2 text-xl font-semibold text-[#EDEDE8]">{result.serviceName}</h2>
        <p className="mt-2 text-sm text-[#A1A19A]">Copy this ingestion endpoint into your alert source.</p>
        <code className="mt-4 block break-all rounded border border-[#2B2A24] bg-[#121211] p-3 font-mono text-sm text-[#D4D4CE]">
          {result.webhookUrl}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(result.webhookUrl);
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Vercel resource ID" name="platformServiceId" placeholder="prj_xxxxxxxxxxxxxxxxxxxx" required />
          <FormField label="Vercel access token" name="platformApiToken" type="password" required />
          <FormField label="Vercel team ID (optional)" name="platformTeamId" placeholder="team_xxxxxxxxxxxxxxxxxxxx" />
        </div>
      )}
      {deploymentProvider === "RENDER" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Render service ID" name="platformServiceId" placeholder="srv-xxxxxxxxxxxxxxxxxxxx" required />
          <FormField label="Render API key" name="platformApiToken" type="password" required />
        </div>
      )}
      {deploymentProvider === "CUSTOM" && (
        <FormField
          label="Custom webhook URL"
          name="customWebhookUrl"
          type="url"
          placeholder="https://infra.yourcompany.com/api/healix-patch"
          required
        />
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
