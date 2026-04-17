// /types/index.ts — All shared TypeScript interfaces for RepoDoc
// Source: PRD Appendix §10

export interface RoastResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  summary: string;
  criteria: {
    clarity:      { score: number; issue: string | null };
    setup:        { score: number; issue: string | null };
    usage:        { score: number; issue: string | null };
    structure:    { score: number; issue: string | null };
    completeness: { score: number; issue: string | null };
    specificity:  { score: number; issue: string | null };
  };
  top_issues: string[];
}

export interface RepoAnalysis {
  project_name: string;
  description: string;
  tech_stack: string[];
  framework: string | null;
  language: string;
  package_manager: string;
  scripts: {
    install: string | null;
    dev:     string | null;
    build:   string | null;
    test:    string | null;
    start:   string | null;
  };
  env_variables: string[];
  key_dependencies: string[];
  has_docker: boolean;
  has_ci: boolean;
  has_tests: boolean;
  entry_point: string;
  api_routes: string[];
  project_type: 'web-app' | 'cli' | 'library' | 'api' | 'mobile' | 'other';
  notable_features: string[];
  prerequisites: string[];
}

export interface DriftReport {
  drift_score: number;
  status: 'in-sync' | 'minor-drift' | 'moderate-drift' | 'major-drift';
  summary: string;
  changed_items: Array<{
    category: 'dependency' | 'env-var' | 'script' | 'api-route' | 'feature' | 'stack';
    change: string;
    readme_impact: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  sections_to_update: string[];
  recommendation: string;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  owner: string;
  name: string;
  is_private: boolean;
  default_branch: string;
  description: string | null;
  updated_at: string;
}

export interface DriftHistoryPoint {
  date: string;
  score: number;
  status: DriftReport['status'];
}

export interface AnalysisPromptInput {
  repoName: string;
  fileTree: string[];
  manifest: string | null;
  envExample: string | null;
  entryPoint: string | null;
  dockerfile: string | null;
  ciConfig: string | null;
  detectedExtensions: string[];
}

export interface DriftPromptInput {
  repoName: string;
  snapshot: RepoAnalysis;
  current: RepoAnalysis;
  currentReadme: string;
  daysSinceSnapshot: number;
}
