function normalizeRepositoryPath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^file:\/*/i, "")
    .replace(/^[a-zA-Z]:\//, "")
    .replace(/^\/+/, "")
    .replace(/^(?:\.\/)+/, "");
}

function matchingRepositoryPath(candidate: string, availableRepoFiles: string[]): string | null {
  const normalizedCandidate = normalizeRepositoryPath(candidate);
  const exactMatch = availableRepoFiles.find(
    (file) => normalizeRepositoryPath(file) === normalizedCandidate,
  );
  if (exactMatch) return normalizeRepositoryPath(exactMatch);

  const caseInsensitiveMatches = availableRepoFiles.filter(
    (file) => normalizeRepositoryPath(file).toLowerCase() === normalizedCandidate.toLowerCase(),
  );
  return caseInsensitiveMatches.length === 1
    ? normalizeRepositoryPath(caseInsensitiveMatches[0])
    : null;
}

export function resolveRepositoryPath(
  rawPath: string,
  availableRepoFiles: string[] = [],
): string {
  if (!rawPath.trim()) return "";

  const cleanPath = normalizeRepositoryPath(rawPath);
  const exactMatch = matchingRepositoryPath(cleanPath, availableRepoFiles);
  if (exactMatch) return exactMatch;

  const segments = cleanPath.split("/").filter(Boolean);
  for (let index = 1; index < segments.length; index += 1) {
    const candidate = segments.slice(index).join("/");
    const match = matchingRepositoryPath(candidate, availableRepoFiles);
    if (match) return match;
  }

  let bestMatch: string | null = null;
  let maxOverlap = 0;
  let hasAmbiguousBestMatch = false;

  for (const file of availableRepoFiles) {
    const normalizedFile = normalizeRepositoryPath(file);
    const fileSegments = normalizedFile.split("/").filter(Boolean);
    let overlap = 0;
    while (
      overlap < segments.length &&
      overlap < fileSegments.length &&
      segments[segments.length - 1 - overlap].toLowerCase() ===
        fileSegments[fileSegments.length - 1 - overlap].toLowerCase()
    ) {
      overlap += 1;
    }

    if (overlap > maxOverlap) {
      bestMatch = normalizedFile;
      maxOverlap = overlap;
      hasAmbiguousBestMatch = false;
    } else if (overlap > 0 && overlap === maxOverlap && bestMatch !== normalizedFile) {
      hasAmbiguousBestMatch = true;
    }
  }

  if (bestMatch && !hasAmbiguousBestMatch) return bestMatch;
  return cleanPath;
}
