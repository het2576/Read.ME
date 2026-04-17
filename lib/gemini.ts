// /lib/gemini.ts — Gemini AI client with timeout + JSON parsing
// Server-side only — uses GEMINI_API_KEY (not NEXT_PUBLIC)
// SDK: @google/genai (new SDK) with gemini-3-flash-preview

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Model fallback chain — verified working models (tested live against API)
const MODEL_CHAIN = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-27b-it'];

/**
 * Generate text from Gemini with a 20-second timeout.
 * Tries models in fallback order if quota is exhausted or model is unavailable.
 */
export async function generateText(prompt: string): Promise<string> {
  let lastError: Error | null = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      // 20-second timeout via Promise.race
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini request timed out')), 20_000)
      );

      const result = await Promise.race([
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
        }),
        timeoutPromise,
      ]);

      const text = result.text;

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      return text;
    } catch (error) {
      lastError = error as Error;

      const errorMessage = String(error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusCode = (error as any)?.status ?? (error as any)?.code;

      // Recoverable: quota, rate limit, model not found, unavailable
      if (
        statusCode === 429 ||
        statusCode === 404 ||
        statusCode === 503 ||
        errorMessage.includes('429') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('Too Many Requests') ||
        errorMessage.includes('NOT_FOUND') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('UNAVAILABLE')
      ) {
        console.warn(`${modelName} failed [${statusCode ?? 'err'}], trying next model...`);
        continue;
      }

      // Non-recoverable — throw immediately
      throw error;
    }
  }

  // All models exhausted
  throw lastError || new Error('All Gemini models exhausted');
}

/**
 * Check if an error is a quota/rate limit error.
 * Use this to avoid retrying when quota is exhausted.
 */
export function isQuotaError(error: unknown): boolean {
  const msg = String(error);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusCode = (error as any)?.status ?? (error as any)?.code;
  return (
    statusCode === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('Too Many Requests')
  );
}

/**
 * Strip markdown code fences (```json ... ```) and parse JSON.
 * Gemini sometimes wraps JSON output in backtick blocks despite instructions.
 */
export function parseJSON<T>(text: string): T {
  let cleaned = text.trim();

  // Strip ```json ... ``` or ``` ... ``` wrappers
  if (cleaned.startsWith('```')) {
    // Remove opening fence (with optional language tag)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
    // Remove closing fence
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }

  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}
