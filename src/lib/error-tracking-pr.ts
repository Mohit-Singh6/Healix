import type { Octokit } from "@octokit/rest";

type RepositoryFile = {
  path: string;
  content: string;
};

function decodeContent(content: string): string {
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
}

async function readFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref });
    if (Array.isArray(data) || !("content" in data) || data.type !== "file") return null;
    return decodeContent(data.content);
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

function reporterSource(
  webhookUrl: string,
  serviceName: string,
  useTypeScript: boolean,
): string {
  const typedParameters = useTypeScript
    ? `error: unknown, environment: "client" | "server", route?: string, routeType?: string`
    : `error, environment, route, routeType`;
  const typedClientParameters = useTypeScript ? `error: unknown, routeType?: string` : `error, routeType`;
  const returnType = useTypeScript ? `: Promise<void>` : "";
  return `const WEBHOOK_URL = ${JSON.stringify(webhookUrl)};
const SERVICE_NAME = ${JSON.stringify(serviceName)};

export async function reportError(${typedParameters})${returnType} {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error && error.stack ? error.stack : message;
    const payload = JSON.stringify({
      serviceName: SERVICE_NAME,
      message: "[" + environment + "] " + message,
      stackTrace,
      endpoint: typeof route === "string"
        ? route.split(/[?#]/, 1)[0]
        : (typeof location !== "undefined" ? location.pathname : undefined),
      environment,
      routeType,
    });

    if (environment === "client" && typeof navigator !== "undefined" && navigator.sendBeacon) {
      if (navigator.sendBeacon(WEBHOOK_URL, new Blob([payload], { type: "application/json" }))) return;
    }

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: environment === "client",
      signal: AbortSignal.timeout(4000),
    }).catch(() => {});
  } catch {
    // Error reporting must never become another application error.
  }
}

export function reportClientError(${typedClientParameters}) {
  void reportError(error, "client", typeof location !== "undefined" ? location.pathname : undefined, routeType);
}
`;
}

function boundarySource(useTypeScript: boolean): string {
  const types = useTypeScript
    ? `import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };
`
    : `import { Component } from "react";

`;

  const typeAnnotations = useTypeScript
    ? `extends Component<Props, State>`
    : `extends Component`;
  const stateType = useTypeScript ? `: State` : "";
  const caughtErrorType = useTypeScript ? `: Error` : "";
  const errorInfoType = useTypeScript ? `, errorInfo: ErrorInfo` : ", errorInfo";
  const eventTypes = useTypeScript
    ? `(event: ErrorEvent)`
    : `(event)`;
  const rejectionEventTypes = useTypeScript
    ? `(event: PromiseRejectionEvent)`
    : `(event)`;

  return `"use client";

${types}
import { reportClientError } from "./healix-error-reporter";

export class HealixAutoErrorBoundary ${typeAnnotations} {
  state${stateType} = { error: null };

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  static getDerivedStateFromError(error${caughtErrorType}) {
    return { error };
  }

  componentDidCatch(error${caughtErrorType}${errorInfoType}) {
    reportClientError(error, "react-render");
    if (errorInfo.componentStack) {
      reportClientError(new Error(errorInfo.componentStack), "react-component-stack");
    }
  }

  handleWindowError = ${eventTypes} => {
    reportClientError(event.error ?? new Error(event.message), "window-error");
  };

  handleUnhandledRejection = ${rejectionEventTypes} => {
    reportClientError(event.reason, "unhandled-rejection");
  };

  render() {
    if (this.state.error) {
      return (
        <main role="alert" style={{ minHeight: "100vh", display: "grid", placeContent: "center", gap: "1rem", padding: "2rem", textAlign: "center" }}>
          <p>An unexpected error occurred. The incident has been logged and sent for investigation.</p>
          <button type="button" onClick={() => this.setState({ error: null })}>Try again</button>
        </main>
      );
    }
    return this.props.children;
  }
}
`;
}

function defaultInstrumentationSource(
  reporterImport: string,
  useTypeScript: boolean,
  includeRegister = true,
): string {
  if (useTypeScript) {
    return `import { reportError } from "${reporterImport}";
import type { Instrumentation } from "next";

${includeRegister ? registerSource(reporterImport) : ""}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await reportError(error, "server", request.path, context.routeType);
};
`;
  }
  return `import { reportError } from "${reporterImport}";

${includeRegister ? registerSource(reporterImport) : ""}

export async function onRequestError(error, request, context) {
  await reportError(error, "server", request.path, context.routeType);
}
`;
}

function registerSource(reporterImport: string): string {
  return `export function register() {
  if (typeof process === "undefined" || process.env.NEXT_RUNTIME !== "nodejs") return;
  process.on("unhandledRejection", (reason) => {
    void import("${reporterImport}")
      .then(({ reportError }) => reportError(reason, "server", undefined, "unhandled-rejection"))
      .catch(() => {});
  });
}
`;
}

function installUnhandledRejectionHandler(
  source: string,
  reporterImport: string,
): string {
  if (source.includes('"unhandledRejection"') || source.includes("'unhandledRejection'")) {
    return source;
  }

  const functionMatch = source.match(/export\s+(?:async\s+)?function\s+register\s*\(\s*\)\s*\{/);
  const arrowMatch = source.match(/export\s+const\s+register\s*=\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/);
  const match = functionMatch ?? arrowMatch;
  if (match) {
    const insertionPoint = match.index! + match[0].length;
    return `${source.slice(0, insertionPoint)}
  if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      void import("${reporterImport}")
        .then(({ reportError }) => reportError(reason, "server", undefined, "unhandled-rejection"))
        .catch(() => {});
    });
  }
${source.slice(insertionPoint)}`;
  }

  if (/\bexport\s+(?:async\s+)?function\s+register\b|\bexport\s+const\s+register\b/.test(source)) {
    throw new Error("The existing register hook uses an unsupported form; add Healix's unhandled-rejection listener manually.");
  }
  return `${source.trimEnd()}\n\n${registerSource(reporterImport)}`;
}

function injectRequestErrorReporter(
  source: string,
  reporterImport: string,
  useTypeScript: boolean,
): string {
  const functionMatch = source.match(/export\s+(async\s+)?function\s+onRequestError\b[\s\S]*?\)\s*\{/);
  const arrowMatch = source.match(/export\s+const\s+onRequestError\b[\s\S]*?=\s*(async\s*)?\([^)]*\)\s*=>\s*\{/);

  if (!functionMatch && !arrowMatch) {
    if (/export\s+(?:const|let|var)\s+onRequestError\b/.test(source)) {
      throw new Error("The existing onRequestError export uses an unsupported form; merge the Healix reporter into it manually.");
    }
    if (source.includes("healix-error-reporter")) {
      throw new Error("Existing Next.js instrumentation already references a Healix reporter but has no compatible request error hook.");
    }
    return installUnhandledRejectionHandler(
      `${source.trimEnd()}\n\n${defaultInstrumentationSource(reporterImport, useTypeScript, false)}`,
      reporterImport,
    );
  }

  if (source.includes("healix-error-reporter")) {
    throw new Error("Existing Next.js instrumentation already references an error reporter; merge this setup manually to avoid duplicate hooks.");
  }

  const match = functionMatch ?? arrowMatch;
  if (!match) throw new Error("Could not safely update the repository instrumentation hook.");
  const parameterList = match[0].match(/\(([^)]*)\)/)?.[1];
  const parameterNames = parameterList?.split(",").map((parameter) =>
    parameter.trim().match(/^([A-Za-z_$][\w$]*)/)?.[1],
  );
  if (!parameterNames || parameterNames.length < 3 || parameterNames.slice(0, 3).some((name) => !name)) {
    throw new Error("The existing onRequestError hook has parameters Healix cannot safely recognize.");
  }

  const insertionPoint = match.index! + match[0].length;
  let updated = `${source.slice(0, insertionPoint)}
  const { reportError: reportHealixError } = await import("${reporterImport}");
  await reportHealixError(${parameterNames[0]}, "server", ${parameterNames[1]}.path, ${parameterNames[2]}.routeType);
${source.slice(insertionPoint)}`;

  if (functionMatch && !functionMatch[1]) {
    updated = updated.replace(
      /export\s+function\s+onRequestError\b/,
      "export async function onRequestError",
    );
  }
  if (arrowMatch && !arrowMatch[1]) {
    updated = updated.replace(
      /(export\s+const\s+onRequestError\b[\s\S]*?=\s*)(?=\()/,
      "$1async ",
    );
  }
  return installUnhandledRejectionHandler(updated, reporterImport);
}

function wrapLayout(layout: string, boundaryImport: string): string {
  if (layout.includes("HealixAutoErrorBoundary")) return layout;
  if (!layout.includes("{children}")) {
    throw new Error("Could not safely add a client error boundary to the root layout.");
  }
  if (!/export\s+default\b/.test(layout)) {
    throw new Error("The repository root layout has no default export; wrap its page content in HealixAutoErrorBoundary manually.");
  }

  const importStatement = `import { HealixAutoErrorBoundary } from "${boundaryImport}";\n`;
  const directive = layout.match(/^(?:\s*["']use client["'];?\s*)/);
  const withImport = directive
    ? `${layout.slice(0, directive[0].length)}${importStatement}${layout.slice(directive[0].length)}`
    : `${importStatement}${layout}`;
  return withImport.replaceAll("{children}", "<HealixAutoErrorBoundary>{children}</HealixAutoErrorBoundary>");
}

async function fileExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<boolean> {
  return (await readFile(octokit, owner, repo, ref, path)) !== null;
}

export async function createErrorTrackingPullRequest(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  defaultBranch: string;
  serviceName: string;
  webhookUrl: string;
}) {
  const { octokit, owner, repo, defaultBranch, serviceName, webhookUrl } = params;
  const { data: baseRef } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = baseRef.object.sha;
  const { data: baseCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: baseSha,
  });

  const packageJsonText = await readFile(octokit, owner, repo, baseSha, "package.json");
  if (!packageJsonText) {
    throw new Error("Automatic error tracking setup currently requires a Next.js project with a package.json at the repository root.");
  }

  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    packageJson = JSON.parse(packageJsonText) as typeof packageJson;
  } catch {
    throw new Error("The repository package.json is invalid JSON, so Healix could not identify its framework.");
  }

  const nextVersion = packageJson.dependencies?.next ?? packageJson.devDependencies?.next;
  if (!nextVersion) {
    throw new Error("Automatic error tracking setup currently supports Next.js projects. No Next.js dependency was found.");
  }
  const majorVersion = Number(nextVersion.replace(/^[^\d]*/, "").split(".")[0]);
  if (!Number.isFinite(majorVersion) || majorVersion < 15) {
    throw new Error("Automatic error tracking setup requires Next.js 15 or newer for server request instrumentation.");
  }

  const srcApp =
    await fileExists(octokit, owner, repo, baseSha, "src/app/layout.tsx")
    || await fileExists(octokit, owner, repo, baseSha, "src/app/layout.jsx")
    || await fileExists(octokit, owner, repo, baseSha, "src/app/layout.js");
  const appPath = srcApp ? "src/app" : "app";
  const layoutPath = (await fileExists(octokit, owner, repo, baseSha, `${appPath}/layout.tsx`))
    ? `${appPath}/layout.tsx`
    : (await fileExists(octokit, owner, repo, baseSha, `${appPath}/layout.jsx`))
      ? `${appPath}/layout.jsx`
      : (await fileExists(octokit, owner, repo, baseSha, `${appPath}/layout.js`))
        ? `${appPath}/layout.js`
        : null;
  if (!layoutPath) {
    throw new Error("Automatic error tracking setup currently requires the Next.js App Router root layout.");
  }

  const hasTypeScript = layoutPath.endsWith(".tsx")
    || await fileExists(octokit, owner, repo, baseSha, "tsconfig.json");
  const existingTypeScriptInstrumentation = await fileExists(
    octokit,
    owner,
    repo,
    baseSha,
    `${srcApp ? "src/" : ""}instrumentation.ts`,
  );
  const existingJavaScriptInstrumentation = !existingTypeScriptInstrumentation && await fileExists(
    octokit,
    owner,
    repo,
    baseSha,
    `${srcApp ? "src/" : ""}instrumentation.js`,
  );
  const instrumentationExtension = existingTypeScriptInstrumentation || (!existingJavaScriptInstrumentation && hasTypeScript)
    ? "ts"
    : "js";
  const instrumentationPath = `${srcApp ? "src/" : ""}instrumentation.${instrumentationExtension}`;
  const layoutSource = await readFile(octokit, owner, repo, baseSha, layoutPath);
  if (layoutSource === null) throw new Error("The repository root layout could not be read.");

  const reporterPath = `${appPath}/healix-error-reporter.${hasTypeScript ? "ts" : "js"}`;
  const boundaryPath = `${appPath}/healix-error-boundary.${hasTypeScript ? "tsx" : "jsx"}`;
  const instrumentReporterImport = "./app/healix-error-reporter";
  const boundaryImport = "./healix-error-boundary";
  const priorInstrumentation = await readFile(octokit, owner, repo, baseSha, instrumentationPath);
  const updatedInstrumentation = priorInstrumentation === null
    ? defaultInstrumentationSource(instrumentReporterImport, instrumentationExtension === "ts")
    : injectRequestErrorReporter(
      priorInstrumentation,
      instrumentReporterImport,
      instrumentationExtension === "ts",
    );

  const files: RepositoryFile[] = [
    { path: reporterPath, content: reporterSource(webhookUrl, serviceName, hasTypeScript) },
    { path: boundaryPath, content: boundarySource(hasTypeScript) },
    { path: instrumentationPath, content: updatedInstrumentation },
    { path: layoutPath, content: wrapLayout(layoutSource, boundaryImport) },
  ];

  const prefix = "healix/setup-error-tracking";
  const openPullRequests = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "open",
    per_page: 100,
  });
  const existingPullRequest = openPullRequests.data.find(
    (pullRequest) =>
      pullRequest.title === "feat: configure automated incident error tracking" &&
      pullRequest.head.ref.startsWith(prefix),
  );
  if (existingPullRequest) return existingPullRequest;

  let branchName = prefix;
  let createdBranch = false;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) branchName = `${prefix}-${Date.now().toString(36)}-${attempt}`;
    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });
      createdBranch = true;
      break;
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error
        ? error.status
        : undefined;
      if (status !== 422 || attempt === 3) throw error;
    }
  }
  if (!createdBranch) throw new Error("Could not create a unique error-tracking branch.");

  try {
    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseCommit.tree.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        content: file.content,
      })),
    });
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: "feat: configure automated incident error tracking",
      tree: tree.sha,
      parents: [baseSha],
    });
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: commit.sha,
    });

    const { data: pullRequest } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: "feat: configure automated incident error tracking",
      head: branchName,
      base: defaultBranch,
      body: [
        "## Automated incident error tracking",
        "",
        "This pull request adds lightweight error reporting for server request failures, uncaught server promise rejections, browser errors, unhandled rejections, and React render errors.",
        "",
        "### Changes",
        ...files.map((file) => `- Adds or updates \`${file.path}\`.`),
        "",
        "The reporter uses native Web APIs and has no new dependencies. Reporting failures are isolated so they do not cause secondary application errors.",
        "",
        "Merge this pull request to activate error capture for this service.",
      ].join("\n"),
    });
    return pullRequest;
  } catch (error) {
    try {
      await octokit.rest.git.deleteRef({ owner, repo, ref: `heads/${branchName}` });
    } catch (cleanupError) {
      console.error("Could not remove the error-tracking branch after pull request creation failed.", cleanupError);
    }
    throw error;
  }
}
