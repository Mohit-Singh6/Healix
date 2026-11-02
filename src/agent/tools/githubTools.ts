import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import type { Octokit } from "@octokit/rest";

export const readFileDeclaration: FunctionDeclaration = {
  name: "read_file_content",
  description: "Fetches and reads the complete, decoded UTF-8 source code of a specified repository file on the active branch.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "Relative repository path, for example src/utils/auth.ts.",
      },
      startLine: {
        type: Type.NUMBER,
        description: "Optional 1-based first line to return.",
      },
      endLine: {
        type: Type.NUMBER,
        description: "Optional 1-based last line to return.",
      },
    },
    required: ["filePath"],
  },
};

export const listDirectoryDeclaration: FunctionDeclaration = {
  name: "list_directory",
  description: "Lists the names and types (file or directory) of files at a given directory path in the repository.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      dirPath: {
        type: Type.STRING,
        description: "Relative directory path, or an empty string for the repository root.",
      },
    },
    required: ["dirPath"],
  },
};

type GithubToolArgs = Record<string, unknown>;

function normalizeRepositoryPath(path: string): string {
  const segments = path.replace(/\\/g, "/").split("/").filter((segment) => segment && segment !== ".");
  if (segments.some((segment) => segment === "..")) {
    throw new Error("Repository paths cannot traverse parent directories.");
  }
  return segments.join("/");
}

function responseStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export async function executeGithubTool(params: {
  toolName: string;
  args: GithubToolArgs;
  octokit: Octokit;
  owner: string;
  repo: string;
  ref: string;
}): Promise<string> {
  const { toolName, args, octokit, owner, repo, ref } = params;

  if (toolName === "read_file_content") {
    const rawPath = args.filePath;
    if (typeof rawPath !== "string" || !rawPath.trim()) {
      return "Error: filePath must be a non-empty repository-relative path.";
    }

    let filePath: string;
    try {
      filePath = normalizeRepositoryPath(rawPath);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Invalid repository path."}`;
    }

    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path: filePath, ref });
      if (Array.isArray(data)) {
        return "Target path is a directory, not a file. Use list_directory instead.";
      }
      if (data.type !== "file" || !("content" in data) || data.encoding !== "base64") {
        return `Error: Path '${filePath}' did not resolve to a readable source file.`;
      }

      const content = Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8");
      const startLine = args.startLine;
      const endLine = args.endLine;
      if (typeof startLine === "number" && typeof endLine === "number") {
        if (
          !Number.isInteger(startLine) ||
          !Number.isInteger(endLine) ||
          startLine < 1 ||
          endLine < startLine
        ) {
          return "Error: startLine and endLine must be valid 1-based line numbers.";
        }
        return content
          .split(/\r?\n/)
          .slice(startLine - 1, endLine)
          .map((line, index) => `${startLine + index}: ${line}`)
          .join("\n");
      }
      return content;
    } catch (error) {
      if (responseStatus(error) === 404) {
        return `Error: File not found at path '${filePath}'. Check the directory structure with list_directory.`;
      }
      throw error;
    }
  }

  if (toolName === "list_directory") {
    const rawPath = args.dirPath;
    if (typeof rawPath !== "string") {
      return "Error: dirPath must be a repository-relative path or an empty string for the root.";
    }

    let dirPath: string;
    try {
      dirPath = normalizeRepositoryPath(rawPath);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Invalid repository path."}`;
    }

    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: dirPath,
        ref,
      });
      if (!Array.isArray(data)) {
        return `Error: '${dirPath || "/"}' is a file. Use read_file_content instead.`;
      }

      return data
        .map((entry) => {
          const entryPath = entry.path;
          if (entry.type === "dir") return `[DIR]  ${entryPath}`;
          return `[FILE] ${entryPath} (${formatFileSize(entry.size)})`;
        })
        .join("\n") || "Directory is empty.";
    } catch (error) {
      if (responseStatus(error) === 404) {
        return `Error: Directory not found at path '${dirPath}'.`;
      }
      throw error;
    }
  }

  throw new Error(`Unknown GitHub inspection tool: ${toolName}`);
}
