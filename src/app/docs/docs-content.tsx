import Link from "next/link";
import { notFound } from "next/navigation";
import DocsPageFrame from "@/src/components/docs/DocsPageFrame";

type DocPage = {
  slug: string;
  title: string;
  category: string;
  toc: { id: string; title: string }[];
  related?: { title: string; href: string; description: string };
  body: React.ReactNode;
};

const pages: Record<string, DocPage> = {
  introduction: {
    slug: "introduction",
    title: "Introduction to Healix",
    category: "Getting started",
    toc: [
      { id: "why-healix", title: "Why Healix?" },
      { id: "core-concepts", title: "Core concepts" },
      { id: "how-it-works", title: "How it works" },
    ],
    related: {
      title: "Why GitHub permissions are needed",
      href: "/docs/why-github-permissions",
      description: "Understand repository access, pull request permissions, and credential handling.",
    },
    body: (
      <>
        <p>
          Healix is an autonomous, vendor-agnostic incident remediation copilot designed to bridge the gap between production crash alerts and deployed code fixes. It captures unhandled exceptions, correlates runtime failures with repository history, and prepares verified fixes as pull requests.
        </p>
        <h2 id="why-healix">Why Healix?</h2>
        <p>Traditional error trackers tell you when something is broken. Healix helps your team understand why and prepare a safe fix.</p>
        <ul>
          <li><strong>Zero-dependency telemetry:</strong> capture errors with native runtime hooks instead of adding a heavy SDK.</li>
          <li><strong>Dual-runtime coverage:</strong> connect server-side errors and frontend crashes to the same service.</li>
          <li><strong>Autonomous investigation:</strong> correlate stack traces with affected code and recent repository history.</li>
          <li><strong>Human-in-the-loop safeguards:</strong> review every proposed change in a pull request before it is merged.</li>
        </ul>
        <h2 id="core-concepts">Core concepts</h2>
        <ul>
          <li><strong>Services</strong> represent monitored applications or microservices linked to a repository and environment.</li>
          <li><strong>Telemetry endpoints</strong> are unique ingestion URLs that receive reports for a service.</li>
          <li><strong>Remediation copilot</strong> investigates incoming incidents and prepares a proposed fix for review.</li>
        </ul>
        <h2 id="how-it-works">How it works</h2>
        <ol>
          <li>Connect one or more repositories through the Healix GitHub App.</li>
          <li>Set up error capture with an instrumentation pull request or forward your existing logs to the service webhook.</li>
          <li>Your application sends runtime errors to the service ingestion endpoint.</li>
          <li>Review the incident analysis and any proposed fix pull request before merging.</li>
        </ol>
        <div className="not-prose mt-8 rounded-lg border border-[#2B2A24] bg-[#111110] p-4">
          <p className="text-sm text-[#A1A19A]">Curious about repository access?</p>
          <Link href="/docs/why-github-permissions" className="mt-1 inline-block text-sm font-medium text-[#F59E0B] hover:text-[#FDBA32]">
            Why GitHub permissions are needed →
          </Link>
        </div>
      </>
    ),
  },
  "connecting-services": {
    slug: "connecting-services",
    title: "Connecting Your Service & GitHub Setup",
    category: "Getting started",
    toc: [
      { id: "what-is-a-service", title: "What is a service?" },
      { id: "connect-github", title: "Connect GitHub" },
      { id: "choose-repository", title: "Choose a repository" },
      { id: "configure-service", title: "Configure the service" },
    ],
    related: {
      title: "Why GitHub permissions are needed",
      href: "/docs/why-github-permissions",
      description: "See what access is requested and how it is used.",
    },
    body: (
      <>
        <p>Connect a repository to create a Healix service. A service groups the repository, environment settings, and telemetry endpoint used to investigate its incidents.</p>
        <h2 id="what-is-a-service">What is a service?</h2>
        <p>A service is one monitored codebase or application. Create separate services when you want independent telemetry endpoints, environments, or incident streams.</p>
        <h2 id="connect-github">Connect GitHub</h2>
        <ol>
          <li>Open <strong>Add Service</strong> from your dashboard.</li>
          <li>Install the Healix GitHub App, or select an existing installation.</li>
          <li>Choose access to all repositories or only the repositories you select.</li>
        </ol>
        <p>Healix returns to your workspace after GitHub confirms the installation. You can update repository access later in GitHub App settings.</p>
        <h2 id="choose-repository">Choose a repository</h2>
        <p>If multiple repositories are available, select one from the repository picker. Repositories already configured in Healix are marked as added so they cannot be registered twice.</p>
        <h2 id="configure-service">Configure the service</h2>
        <p>Confirm the verified repository and default branch, choose an editable service name, and select the deployment provider and alert routing details relevant to your environment. Submit the form to create the service and its ingestion endpoint.</p>
      </>
    ),
  },
  instrumentation: {
    slug: "instrumentation",
    title: "Instrumenting Your App for Error Tracking",
    category: "Guides",
    toc: [
      { id: "choose-capture", title: "Choose an error-capture method" },
      { id: "automated-setup", title: "Automated setup" },
      { id: "manual-webhook", title: "Manual webhook" },
      { id: "safe-reporting", title: "Safe reporting behavior" },
    ],
    related: {
      title: "How error catching works",
      href: "/docs/error-catching-works",
      description: "Explore the frontend and backend reporters and their safeguards.",
    },
    body: (
      <>
        <p>After creating a service, connect application errors to its telemetry endpoint. Choose automated setup for supported application structures, or forward events from your existing monitoring tools.</p>
        <h2 id="choose-capture">Choose an error-capture method</h2>
        <ul>
          <li><strong>Automated setup:</strong> Healix inspects the repository structure and opens a pull request with lightweight reporter code.</li>
          <li><strong>Manual webhook:</strong> copy the service ingestion URL and send compatible error payloads from your existing logger or alert pipeline.</li>
        </ul>
        <h2 id="automated-setup">Automated setup</h2>
        <ol>
          <li>Select <strong>Auto-Setup Error Tracking</strong> from the service setup screen or dashboard.</li>
          <li>Healix identifies a supported framework and prepares instrumentation for its detected entry points.</li>
          <li>Review the generated branch and pull request on GitHub.</li>
          <li>Merge the pull request to activate the instrumentation in your application.</li>
        </ol>
        <p>The generator supports common Next.js App and Pages Router projects, React SPA entry points, and Express/Node server entry points. Unsupported or ambiguous repository structures are rejected rather than overwritten.</p>
        <h2 id="manual-webhook">Manual webhook</h2>
        <p>Copy the unique endpoint shown for your service and configure your logging integration to send a JSON <code>POST</code>. Include a service name, error message, and stack trace. Keep the URL private because it contains the service ingestion credential.</p>
        <h2 id="safe-reporting">Safe reporting behavior</h2>
        <p>Generated reporters use native platform APIs and handle their own network failures so telemetry delivery does not become a second application error. Generated user-facing fallback messages are neutral and include a retry action.</p>
        <div className="not-prose mt-8 rounded-lg border border-[#2B2A24] bg-[#111110] p-4">
          <p className="text-sm text-[#A1A19A]">Want to know exactly what gets added?</p>
          <Link href="/docs/error-catching-works" className="mt-1 inline-block text-sm font-medium text-[#F59E0B] hover:text-[#FDBA32]">
            How error catching works (frontend & backend) →
          </Link>
        </div>
      </>
    ),
  },
  "incident-lifecycle": {
    slug: "incident-lifecycle",
    title: "Incident Lifecycle & Autonomous Fixes",
    category: "Guides",
    toc: [
      { id: "capture-and-triage", title: "Capture and triage" },
      { id: "investigation", title: "Investigation" },
      { id: "review-and-resolution", title: "Review and resolution" },
    ],
    body: (
      <>
        <p>Healix turns an incoming error report into an incident that can be investigated, reviewed, and resolved with a clear audit trail.</p>
        <h2 id="capture-and-triage">Capture and triage</h2>
        <p>When a service endpoint receives a valid report, Healix queues it for processing and groups related events to reduce duplicate noise. The dashboard shows the incident state and supporting runtime context.</p>
        <h2 id="investigation">Investigation</h2>
        <p>The investigation agent uses the available stack trace and repository context to identify likely affected code and relevant changes. Findings and confidence are presented with the incident so an operator can assess the result.</p>
        <h2 id="review-and-resolution">Review and resolution</h2>
        <p>When a remediation is available, Healix proposes a pull request rather than committing directly to your default branch. Review the diff, tests, and rationale on GitHub, then merge or close the pull request according to your team’s process.</p>
        <p>Update incident status from the workspace as your team investigates and resolves the underlying issue.</p>
      </>
    ),
  },
  "managing-services": {
    slug: "managing-services",
    title: "Managing Multiple Services & Team Permissions",
    category: "Guides",
    toc: [
      { id: "add-services", title: "Add more services" },
      { id: "repository-access", title: "Grant repository access" },
      { id: "service-settings", title: "Update service settings" },
    ],
    body: (
      <>
        <p>Manage multiple repositories from one workspace while keeping each service’s configuration and incident stream distinct.</p>
        <h2 id="add-services">Add more services</h2>
        <p>Choose <strong>Add Service</strong> from your dashboard. Repositories granted to your GitHub App installation are available in the picker. Already configured repositories remain visible but disabled.</p>
        <h2 id="repository-access">Grant repository access</h2>
        <p>If a repository is missing, open the GitHub App installation settings, grant access to the repository, then return to Healix and refresh the available repositories. You can also update whether the installation has access to all repositories or a selected subset.</p>
        <h2 id="service-settings">Update service settings</h2>
        <p>Use the service actions menu to edit its display name, deployment provider settings, environment details, and alert routing. Repository identity and default branch remain tied to the selected GitHub repository.</p>
      </>
    ),
  },
  "why-github-permissions": {
    slug: "why-github-permissions",
    title: "Why GitHub Permissions Are Needed",
    category: "Security & privacy",
    toc: [
      { id: "least-privilege", title: "Least privilege" },
      { id: "repository-access-purpose", title: "How access is used" },
      { id: "credential-handling", title: "Credential handling" },
    ],
    related: {
      title: "Connecting Your Service",
      href: "/docs/connecting-services",
      description: "Return to the service setup walkthrough.",
    },
    body: (
      <>
        <p>Healix uses a GitHub App installation so you can select the repositories it may access and revoke that access through GitHub at any time.</p>
        <h2 id="least-privilege">Least privilege</h2>
        <p>Grant the App access only to repositories you want to monitor. Repository selection and permission scopes are managed through the GitHub installation settings.</p>
        <h2 id="repository-access-purpose">How access is used</h2>
        <ul>
          <li><strong>Repository contents read:</strong> inspect project structure and relevant source context for instrumentation and incident investigation.</li>
          <li><strong>Pull request write:</strong> create a proposed instrumentation or remediation branch and open a pull request for your review.</li>
        </ul>
        <p>Healix does not commit directly to your production or default branch as part of this flow. You retain control over whether a pull request is merged.</p>
        <h2 id="credential-handling">Credential handling</h2>
        <p>Healix does not ask for your GitHub password. GitHub App installation tokens are minted for the integration flow and are not personal access tokens. Review the App’s current permission list during installation and in GitHub settings.</p>
      </>
    ),
  },
  "error-catching-works": {
    slug: "error-catching-works",
    title: "How Error Catching Works (Frontend & Backend)",
    category: "Architecture & integrations",
    toc: [
      { id: "zero-dependencies", title: "Zero-dependency reporters" },
      { id: "frontend-reporting", title: "Frontend reporting" },
      { id: "backend-reporting", title: "Backend reporting" },
      { id: "fail-safe", title: "Fail-safe behavior" },
    ],
    related: {
      title: "Instrumenting Your App",
      href: "/docs/instrumentation",
      description: "Set up automated instrumentation or a manual webhook.",
    },
    body: (
      <>
        <p>The automated instrumentation pull request adds small reporting hooks at framework-supported entry points and sends error context to the unique ingestion endpoint for the selected service.</p>
        <h2 id="zero-dependencies">Zero-dependency reporters</h2>
        <p>Generated reporter code uses native <code>fetch</code> and browser APIs instead of adding third-party packages. This keeps the proposed integration small and avoids dependency conflicts.</p>
        <h2 id="frontend-reporting">Frontend reporting</h2>
        <p>For supported React applications, instrumentation connects a boundary and global browser error listeners to the reporter. When a render error is caught, users see a neutral fallback message and a simple retry action rather than product marketing.</p>
        <h2 id="backend-reporting">Backend reporting</h2>
        <p>Server instrumentation uses framework hooks where available or error middleware and process-level handlers for supported Node/Express layouts. Reports can include runtime, route, method, timestamp, message, and stack context.</p>
        <h2 id="fail-safe">Fail-safe behavior</h2>
        <p>Telemetry sends are guarded so a failed network request does not trigger a secondary crash. Review generated files before merging, especially when your application has custom framework entry points or error handling.</p>
      </>
    ),
  },
};

export function getDocPage(slug: string) {
  const page = pages[slug];
  if (!page) notFound();

  return (
    <DocsPageFrame
      slug={page.slug}
      title={page.title}
      category={page.category}
      toc={page.toc}
      related={page.related}
    >
      {page.body}
    </DocsPageFrame>
  );
}
