"use client";

import { useState } from "react";
import { Flame, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoastResult } from "@/types";

const GITHUB_URL_PATTERN = /^https?:\/\/(www\.)?github\.com\/[^\/\s]+\/[^\/\s]+/;

interface RoastInputProps {
  onResult: (result: RoastResult) => void;
  onLoading: (loading: boolean) => void;
}

export function RoastInput({ onResult, onLoading }: RoastInputProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = GITHUB_URL_PATTERN.test(url.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidUrl) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }

    setIsLoading(true);
    onLoading(true);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // Check if response has the expected RoastResult shape
      if (data.grade && data.score !== undefined) {
        onResult(data as RoastResult);
      } else {
        setError("Unexpected response format. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      onLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            className="h-12 text-base pl-4 pr-4 bg-background/50 border-border/50 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 rounded-xl"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="h-12 px-6 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Roasting...
            </>
          ) : (
            <>
              <Flame className="mr-2 h-5 w-5" />
              Roast It 🔥
            </>
          )}
        </Button>
      </div>

      {/* Validation hint */}
      {url.trim() && !isValidUrl && !error && (
        <p className="text-sm text-muted-foreground mt-2 ml-1">
          Enter a full GitHub URL like{" "}
          <span className="font-mono text-xs">
            https://github.com/owner/repo
          </span>
        </p>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
