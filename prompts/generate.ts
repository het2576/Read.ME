// /prompts/generate.ts — README generation prompt builder
// ACCURACY-HARDENED: strict data-only rules, no Acknowledgments section,
// structured with Problem → Solution → Setup framing

import type { RepoAnalysis } from '@/types';

export function buildGeneratePrompt(
  analysis: RepoAnalysis,
  fileTree?: string[]
): string {
  const projectStructure = fileTree?.length
    ? buildProjectStructureSection(fileTree)
    : '';

  return `
You are a world-class open-source documentation engineer writing a README for production use.
Your README will be read by developers, recruiters, and open-source contributors.

Project Analysis Data (GROUND TRUTH — use ONLY this):
${JSON.stringify(analysis, null, 2)}

${projectStructure ? `File Tree:\n${projectStructure}\n` : ''}

═══════════════════════════════════════════════
ABSOLUTE RULES — VIOLATING THESE IS UNACCEPTABLE
═══════════════════════════════════════════════

1. USE ONLY data from the analysis object above. NEVER invent or assume.
2. If a field is null, empty array, or missing → OMIT that entire section completely.
3. Only list technologies that appear in tech_stack or key_dependencies.
4. Only list env variables that appear in env_variables. Zero inferred ones.
5. Only list API routes that appear in api_routes.
6. Use EXACT command strings from the scripts object — no modifications.
7. Write in second person imperative ("Run...", "Install...", "Copy...")
8. Every sentence must add real information. Zero filler. Zero generic text.
9. Do NOT add any section for Acknowledgments, Credits, or Similar Projects.
10. If has_docker is false → do NOT write a Docker section.
11. If has_tests is false → do NOT write a Testing section.
12. If has_ci is false → do NOT add CI badges.

═══════════════════════════════════════════════
README STRUCTURE (skip any section where data is missing)
═══════════════════════════════════════════════

### 1. Title + Tagline
\`\`\`
# [emoji] [project_name]
> [One powerful sentence: what this does + main benefit. Be specific.]
\`\`\`
Choose an emoji that matches the project_type.

### 2. Badges (shields.io)
Build a single row of relevant badges:
- Language: \`![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)\`
- Framework (if framework != null): use official shield color
- CI badge ONLY if has_ci = true
- Docker badge ONLY if has_docker = true
- Always add: \`![License](https://img.shields.io/badge/License-MIT-green?style=flat)\`

### 3. Table of Contents
Bullet list with anchor links to every section.

### 4. 🧩 Problem & Solution
Two-paragraph section:
**The Problem:** Describe the real-world pain point this project solves.
Base this on the project_name, description, and notable_features — not generic text.

**The Solution:** How does this project solve it? What's the core mechanism?
Be specific: name the key technologies and how they work together.

### 5. ✨ Features
Bullet list from notable_features. Each item:
- Starts with an emoji
- Is one clear, specific sentence
- Names the technology responsible
Only list features from notable_features. Do not invent.

### 6. 🛠️ Tech Stack
Markdown table: | Technology | Purpose |
Include ALL items from tech_stack with real purpose descriptions.
Group by category if more than 6 items: Frontend | Backend | Database | Tools

### 7. 📋 Prerequisites
Numbered list from prerequisites field.
Add version numbers wherever visible. Link to installation pages.

### 8. 🚀 Getting Started
Full numbered setup with fenced code blocks:
\`\`\`\`
1. Clone the repository
\`\`\`bash
git clone https://github.com/{owner}/{project_name}.git
cd {project_name}
\`\`\`

2. Install dependencies
\`\`\`bash
{exact scripts.install command or infer from package_manager}
\`\`\`

3. Configure environment variables
\`\`\`bash
cp .env.example .env.local
\`\`\`
\`\`\`\`

### 9. ⚙️ Environment Variables
ONLY if env_variables is non-empty:
Table: | Variable | Description | Required |
Infer description from variable name. Mark as Required unless name suggests optional.

### 10. 📁 Project Structure
ONLY if file tree was provided:
\`\`\`
[visual tree with directory comments]
\`\`\`

### 11. 💻 Usage
How to run development server (scripts.dev).
How to build for production (scripts.build).
How to start production (scripts.start).
Each as a separate labeled code block.

### 12. 🔗 API Reference
ONLY if api_routes is non-empty:
Table: | Method | Endpoint | Description |
Write a useful description for each route. No invented routes.

### 13. 🧪 Running Tests
ONLY if has_tests = true:
Show exact test command from scripts.test.

### 14. 🐳 Docker
ONLY if has_docker = true:
Show docker build + run commands using project_name.

### 15. 🤝 Contributing
Standard 4-step guide:
1. Fork → 2. Create branch → 3. Commit → 4. Open PR
Include one sentence on code quality expectations.

### 16. 📄 License
MIT License. Include a link to the LICENSE file.

═══════════════════════════════════════════════
Return ONLY raw markdown. No wrapping backticks. No explanation.
Make this README worthy of a GitHub trending page.
`.trim();
}

/**
 * Build a visual project structure from the file tree.
 * Shows top 2 directory levels with file counts.
 */
function buildProjectStructureSection(fileTree: string[]): string {
  const structure = new Map<string, Set<string>>();

  for (const path of fileTree.slice(0, 200)) {
    const parts = path.split('/');
    if (parts.length >= 1) {
      const topLevel = parts[0];
      if (!structure.has(topLevel)) {
        structure.set(topLevel, new Set());
      }
      if (parts.length >= 2) {
        structure.get(topLevel)!.add(parts[1]);
      }
    }
  }

  const lines: string[] = [];
  const entries = Array.from(structure.entries());
  for (const [dir, children] of entries) {
    const childArr = Array.from(children);
    if (childArr.length > 0) {
      lines.push(`${dir}/`);
      for (const child of childArr.slice(0, 8)) {
        lines.push(`  ${child}`);
      }
      if (childArr.length > 8) {
        lines.push(`  ... (${childArr.length - 8} more)`);
      }
    } else {
      lines.push(dir);
    }
  }

  return lines.slice(0, 40).join('\n');
}
