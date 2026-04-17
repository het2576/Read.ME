// /lib/generator.ts — README generation logic
// Takes a RepoAnalysis + optional file tree, calls Gemini, returns clean markdown

import { generateText } from '@/lib/gemini';
import { buildGeneratePrompt } from '@/prompts/generate';
import type { RepoAnalysis } from '@/types';

/**
 * Generate a README.md from a RepoAnalysis.
 * Returns clean markdown string (backtick wrappers stripped).
 */
export async function generateReadme(
  analysis: RepoAnalysis,
  fileTree?: string[]
): Promise<string> {
  // Validate that analysis is populated
  if (!analysis || typeof analysis !== 'object' || !Array.isArray(analysis.tech_stack)) {
    throw new Error('Invalid or incomplete analysis provided to generator.');
  }

  const prompt = buildGeneratePrompt(analysis, fileTree);
  const rawOutput = await generateText(prompt);

  // Strip backtick wrappers if Gemini added them
  return stripMarkdownFence(rawOutput);
}

/**
 * Strip markdown code fence wrappers from Gemini output.
 * Handles: ```markdown\n...\n```, ```\n...\n```, etc.
 */
function stripMarkdownFence(text: string): string {
  let cleaned = text.trim();

  if (cleaned.startsWith('```')) {
    // Remove opening fence (with optional language tag like ```markdown)
    cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/, '');
    // Remove closing fence
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }

  return cleaned.trim();
}
