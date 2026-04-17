// /prompts/analyze.ts — Repo analysis prompt builder
// ACCURACY-HARDENED: Only uses data explicitly visible in provided files

import type { AnalysisPromptInput } from '@/types';

export function buildAnalyzePrompt(input: AnalysisPromptInput): string {
  // Extract explicit package names from the manifest for the AI to cross-check
  const manifestPackageNames = extractManifestPackages(input.manifest);

  return `
You are a senior engineer performing a STRICT technical extraction of a GitHub repository.
Your job is to extract ONLY information that is EXPLICITLY present in the files shown below.

Repository: ${input.repoName}

════════════════════════════════════════════════
EXPLICIT EXTRACTION RULES — READ BEFORE ANALYZING
════════════════════════════════════════════════

1. tech_stack: ONLY include technologies whose package names appear in the manifest dependencies list below.
   Do NOT add any technology that is not listed there, even if you recognize it from file extensions.
   
2. key_dependencies: ONLY list packages present in the manifest. Each entry must be "package-name — purpose".
   
3. env_variables: ONLY list variables explicitly present in .env.example (shown below). If .env.example 
   is not found, return an empty array []. Do NOT infer env vars from code.
   
4. api_routes: ONLY list routes from route files shown in the file tree. Do NOT invent routes.
   
5. has_docker: true ONLY if Dockerfile content is shown. Otherwise false.
   
6. has_ci: true ONLY if CI config content is shown. Otherwise false.
   
7. has_tests: true ONLY if a test script exists in manifest scripts OR test files appear in file tree.
   
8. scripts: ONLY use exact values from the manifest "scripts" object. If a key is missing, use null.

9. description: Write ONLY based on the manifest name/description field and actual file structure.
   Do NOT hallucinate features. Structure as: Problem → Who it's for → How it solves it.

═══════════════════════════════════════════
MANIFEST PACKAGES (cross-check tech_stack against this list):
${manifestPackageNames.length > 0 ? manifestPackageNames.join(', ') : 'No manifest found'}
═══════════════════════════════════════════

File tree (first 150 paths):
${input.fileTree.slice(0, 150).join('\n')}

Key file contents:

=== package.json / manifest ===
${input.manifest || 'NOT FOUND — set has_tests=false, use empty scripts object'}

=== .env.example ===
${input.envExample || 'NOT FOUND — env_variables MUST be empty array []'}

=== Entry point ===
${input.entryPoint ? input.entryPoint.slice(0, 600) : 'NOT FOUND'}

=== Dockerfile ===
${input.dockerfile || 'NOT FOUND — has_docker MUST be false'}

=== CI config ===
${input.ciConfig || 'NOT FOUND — has_ci MUST be false'}

Detected file extensions (secondary signal only, not primary tech detection):
${input.detectedExtensions.join(', ')}

═══════════════════════════════════════════
Return ONLY valid JSON. No explanation. No markdown fences. No backticks.
Every field in tech_stack MUST correspond to a package name in the manifest above.
═══════════════════════════════════════════

{
  "project_name": "exact repo name from manifest name field or repo name",
  "description": "3-4 sentences: (1) What specific problem does this solve? (2) Who is the target user? (3) How does it technically solve the problem? (4) What makes it different? Base ONLY on what you see in the manifest and file structure.",
  "tech_stack": ["ONLY packages explicitly in the manifest — e.g. Next.js if 'next' is in dependencies"],
  "framework": "Primary framework from manifest or null",
  "language": "TypeScript or JavaScript or Python etc. — inferred from extensions",
  "package_manager": "npm/yarn/pnpm/pip/cargo — inferred from lock files in file tree",
  "scripts": {
    "install": "exact value from manifest scripts.install or 'npm install' if npm used",
    "dev": "exact value from manifest scripts.dev or null",
    "build": "exact value from manifest scripts.build or null",
    "test": "exact value from manifest scripts.test or null",
    "start": "exact value from manifest scripts.start or null",
    "lint": "exact value from manifest scripts.lint or null"
  },
  "env_variables": ["ONLY variables from .env.example shown above — empty array if not found"],
  "key_dependencies": ["ONLY from manifest. Format: 'package-name — one-line purpose'. Max 12 items."],
  "has_docker": false,
  "has_ci": false,
  "has_tests": false,
  "entry_point": "main entry file path from file tree or null",
  "api_routes": ["Only route paths visible in file tree — empty array if no route files found"],
  "project_type": "web-app|cli|library|api|mobile|other",
  "notable_features": [
    "5-8 SPECIFIC features inferred STRICTLY from tech_stack and file structure",
    "Each must be a concrete capability, not a generic claim",
    "Example: 'GitHub OAuth with repo read/write scope via NextAuth.js'"
  ],
  "prerequisites": ["Node.js >= 18", "Infer from manifest engines field or package_manager"]
}
`.trim();
}

/**
 * Extract all package names from a manifest string (package.json, pyproject.toml, etc.)
 * Returns a flat list of dependency names for the AI to cross-check against.
 */
export function extractManifestPackages(manifest: string | null): string[] {
  if (!manifest) return [];

  try {
    // Try JSON (package.json, composer.json)
    const parsed = JSON.parse(manifest);

    const names: string[] = [];
    const depKeys = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    for (const key of depKeys) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        names.push(...Object.keys(parsed[key]));
      }
    }
    return names.filter(Boolean);
  } catch {
    // Not JSON — extract from plain text (pyproject.toml, Cargo.toml, go.mod)
    const lines = manifest.split('\n');
    const names: string[] = [];
    for (const line of lines) {
      // pyproject: "package>=version", Cargo: 'package = "version"', go.mod: "module/path vX.X.X"
      const match = line.match(/["']?([a-zA-Z0-9_\-./]+)["']?\s*[>=^~]/) ||
                    line.match(/^([\w\-]+)\s*=/) ||
                    line.match(/^\s+([\w./\-]+)\s+v[\d]/);
      if (match?.[1]) names.push(match[1]);
    }
    return names.filter(Boolean);
  }
}
