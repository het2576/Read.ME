// /lib/analyzer.ts — Repo analysis logic (ACCURACY-HARDENED)
// Post-processes AI output to remove hallucinated tech that wasn't in the manifest

import { getRepoTree, getFileContent } from '@/lib/github';
import { generateText, parseJSON, isQuotaError } from '@/lib/gemini';
import { buildAnalyzePrompt, extractManifestPackages } from '@/prompts/analyze';
import type { RepoAnalysis, AnalysisPromptInput } from '@/types';

// File patterns to identify key files (priority order)
const MANIFEST_FILES = [
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'Gemfile',
  'composer.json',
];

const ENV_FILES = ['.env.example', '.env.sample', '.env.template'];

const ENTRY_PATTERNS = [
  /^src\/index\.[jt]sx?$/,
  /^src\/main\.[jt]sx?$/,
  /^app\/main\.[jt]sx?$/,
  /^cmd\/main\.go$/,
  /^main\.[jt]sx?$/,
  /^main\.py$/,
  /^main\.go$/,
  /^index\.[jt]sx?$/,
  /^app\.py$/,
  /^server\.[jt]sx?$/,
];

const ROUTE_PATTERNS = [/route\.[jt]sx?$/, /router\.[jt]sx?$/, /urls\.py$/];
const CONFIG_FILES = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'];
const CI_PATTERNS = [/^\.github\/workflows\/.*\.ya?ml$/];

/**
 * Analyze a repository by fetching its structure and key files,
 * then calling Gemini to produce a structured RepoAnalysis.
 * Post-processes the result to strip hallucinated tech.
 */
export async function analyzeRepo(
  token: string,
  owner: string,
  repo: string
): Promise<RepoAnalysis> {
  // 1. Fetch file tree
  const fileTree = await getRepoTree(token, owner, repo);

  // 2. Identify key files to fetch (max 20)
  const filesToFetch = identifyKeyFiles(fileTree);

  // 3. Fetch file contents in parallel
  const fileContents = await fetchFileContents(token, owner, repo, filesToFetch);

  // 4. Detect file extensions
  const detectedExtensions = detectExtensions(fileTree);

  // 5. Build prompt input
  const promptInput: AnalysisPromptInput = {
    repoName: `${owner}/${repo}`,
    fileTree,
    manifest: fileContents.manifest,
    envExample: fileContents.envExample,
    entryPoint: fileContents.entryPoint,
    dockerfile: fileContents.dockerfile,
    ciConfig: fileContents.ciConfig,
    detectedExtensions,
  };

  // 6. Call Gemini
  const prompt = buildAnalyzePrompt(promptInput);
  let analysis: RepoAnalysis;

  try {
    const responseText = await generateText(prompt);
    analysis = parseJSON<RepoAnalysis>(responseText);
  } catch (error) {
    if (isQuotaError(error)) throw error;

    // Retry once with stricter prompt
    console.error('Analysis parse error, retrying:', error);
    const retryText = await generateText(
      prompt + '\n\nCRITICAL: Return ONLY the JSON object. Absolutely no other text, no backticks.'
    );
    analysis = parseJSON<RepoAnalysis>(retryText);
  }

  // 7. Post-process: strip hallucinated tech that isn't in the manifest
  const cleanedAnalysis = sanitizeAnalysis(analysis, fileContents.manifest, fileTree);

  return cleanedAnalysis;
}

/**
 * Sanitize analysis by removing tech references that don't appear
 * in the manifest or file tree — the key accuracy fix.
 */
function sanitizeAnalysis(
  analysis: RepoAnalysis,
  manifest: string | null,
  fileTree: string[]
): RepoAnalysis {
  const manifestPackages = extractManifestPackages(manifest);
  const manifestLower = new Set(manifestPackages.map((p) => p.toLowerCase()));
  const fileTreeStr = fileTree.join(' ').toLowerCase();

  // Canonical tech names that map to package names (for display name vs npm name)
  const TECH_ALIAS_MAP: Record<string, string[]> = {
    'next.js': ['next'],
    'nextjs': ['next'],
    'react': ['react'],
    'typescript': ['typescript'],
    'tailwindcss': ['tailwindcss'],
    'tailwind css': ['tailwindcss'],
    'supabase': ['@supabase/supabase-js'],
    'prisma': ['prisma', '@prisma/client'],
    'express': ['express'],
    'fastapi': ['fastapi'],
    'shadcn/ui': ['@radix-ui'],
    'shadcn': ['@radix-ui'],
    'radix ui': ['@radix-ui'],
    'recharts': ['recharts'],
    'next-auth': ['next-auth'],
    'nextauth': ['next-auth'],
    'octokit': ['octokit'],
    'zod': ['zod'],
    'drizzle': ['drizzle-orm'],
    'mongodb': ['mongodb', 'mongoose'],
    'postgresql': ['pg', '@supabase/supabase-js', 'prisma'],
    'sqlite': ['better-sqlite3', 'sqlite3'],
    'redis': ['redis', 'ioredis'],
    'stripe': ['stripe'],
    'clerk': ['@clerk/nextjs', '@clerk/clerk-sdk-node'],
    'trpc': ['@trpc/client', '@trpc/server'],
    'graphql': ['graphql'],
    'apollo': ['@apollo/client'],
    'jest': ['jest'],
    'vitest': ['vitest'],
    'playwright': ['playwright', '@playwright/test'],
    'cypress': ['cypress'],
    'docker': [],  // detected from Dockerfile, not manifest
    'github actions': [],  // detected from .github/workflows
  };

  function isTechPresent(techName: string): boolean {
    const techLower = techName.toLowerCase();

    // Direct match in manifest packages
    if (manifestLower.has(techLower)) return true;

    // Check aliases
    const aliases = TECH_ALIAS_MAP[techLower];
    if (aliases !== undefined) {
      // If aliases is empty array, it's file-tree-based (Docker, CI)
      if (aliases.length === 0) return true;
      return aliases.some((alias) =>
        Array.from(manifestLower).some((pkg) => pkg.includes(alias.toLowerCase()))
      );
    }

    // Partial match — if the tech name appears as a substring in any package name
    const found = Array.from(manifestLower).some(
      (pkg) => pkg.includes(techLower) || techLower.includes(pkg)
    );
    if (found) return true;

    // File-tree fallback — if a config file for this tech exists
    const fileTreeIndicators: Record<string, string[]> = {
      'docker': ['dockerfile', 'docker-compose'],
      'github actions': ['.github/workflows'],
      'eslint': ['.eslintrc', 'eslint.config'],
      'prettier': ['.prettierrc', 'prettier.config'],
      'vite': ['vite.config'],
      'webpack': ['webpack.config'],
    };
    const indicators = fileTreeIndicators[techLower];
    if (indicators) {
      return indicators.some((ind) => fileTreeStr.includes(ind));
    }

    return false;
  }

  // Filter tech_stack
  const filteredTechStack = (analysis.tech_stack || []).filter((tech) => {
    const present = isTechPresent(tech);
    if (!present) {
      console.warn(`[Analyzer] Removed hallucinated tech: "${tech}" (not in manifest)`);
    }
    return present;
  });

  // Filter key_dependencies — must reference packages in manifest
  const filteredDependencies = (analysis.key_dependencies || []).filter((dep) => {
    const pkgName = dep.split(' — ')[0]?.trim().toLowerCase();
    if (!pkgName) return false;
    const present = manifestLower.has(pkgName) ||
      Array.from(manifestLower).some((pkg) => pkg.includes(pkgName) || pkgName.includes(pkg));
    if (!present) {
      console.warn(`[Analyzer] Removed hallucinated dependency: "${dep}"`);
    }
    return present;
  });

  // Ensure boolean flags are correct
  const hasDocker = manifest
    ? fileTree.some((f) => f.toLowerCase().includes('dockerfile'))
    : false;
  const hasCi = fileTree.some((f) => /^\.github\/workflows\/.*\.ya?ml$/.test(f));
  const hasTests =
    (analysis.scripts?.test != null) ||
    fileTree.some((f) =>
      /\.(test|spec)\.[jt]sx?$/.test(f) ||
      f.includes('__tests__') ||
      f.includes('/tests/')
    );

  return {
    ...analysis,
    tech_stack: filteredTechStack.length > 0 ? filteredTechStack : analysis.tech_stack,
    key_dependencies: filteredDependencies,
    has_docker: hasDocker,
    has_ci: hasCi,
    has_tests: hasTests,
  };
}

/**
 * Identify key files to fetch from the file tree.
 */
function identifyKeyFiles(fileTree: string[]): {
  manifest: string | null;
  envExample: string | null;
  entryPoint: string | null;
  dockerfile: string | null;
  ciConfig: string | null;
  routeFiles: string[];
} {
  let manifest: string | null = null;
  let envExample: string | null = null;
  let entryPoint: string | null = null;
  let dockerfile: string | null = null;
  let ciConfig: string | null = null;
  const routeFiles: string[] = [];

  for (const path of fileTree) {
    const basename = path.split('/').pop() || '';

    // Manifest
    if (!manifest && MANIFEST_FILES.includes(basename)) {
      manifest = path;
    }

    // Environment
    if (!envExample && ENV_FILES.includes(basename)) {
      envExample = path;
    }

    // Entry point
    if (!entryPoint && ENTRY_PATTERNS.some((p) => p.test(path))) {
      entryPoint = path;
    }

    // Dockerfile
    if (!dockerfile && CONFIG_FILES.includes(basename)) {
      dockerfile = path;
    }

    // CI config
    if (!ciConfig && CI_PATTERNS.some((p) => p.test(path))) {
      ciConfig = path;
    }

    // Route files (up to 5)
    if (routeFiles.length < 5 && ROUTE_PATTERNS.some((p) => p.test(basename))) {
      routeFiles.push(path);
    }
  }

  return { manifest, envExample, entryPoint, dockerfile, ciConfig, routeFiles };
}

/**
 * Fetch the contents of identified key files.
 */
async function fetchFileContents(
  token: string,
  owner: string,
  repo: string,
  files: ReturnType<typeof identifyKeyFiles>
): Promise<{
  manifest: string | null;
  envExample: string | null;
  entryPoint: string | null;
  dockerfile: string | null;
  ciConfig: string | null;
}> {
  const [manifest, envExample, entryPoint, dockerfile, ciConfig] =
    await Promise.all([
      files.manifest ? getFileContent(token, owner, repo, files.manifest) : null,
      files.envExample ? getFileContent(token, owner, repo, files.envExample) : null,
      files.entryPoint ? getFileContent(token, owner, repo, files.entryPoint) : null,
      files.dockerfile ? getFileContent(token, owner, repo, files.dockerfile) : null,
      files.ciConfig ? getFileContent(token, owner, repo, files.ciConfig) : null,
    ]);

  return { manifest, envExample, entryPoint, dockerfile, ciConfig };
}

/**
 * Detect unique file extensions from the file tree.
 */
function detectExtensions(fileTree: string[]): string[] {
  const extensions = new Set<string>();

  for (const path of fileTree) {
    const dot = path.lastIndexOf('.');
    if (dot > 0) {
      extensions.add(path.slice(dot));
    }
  }

  return Array.from(extensions).sort();
}
