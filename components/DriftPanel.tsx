"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DriftReport } from "@/types";
import Link from "next/link";

interface DriftPanelProps {
  repoId: string;
  repoFullName: string;
  onRegenerate?: () => void;
}

const STATUS_CONFIG = {
  "in-sync": {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
    label: "In Sync",
  },
  "minor-drift": {
    color: "text-yellow-500",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    icon: AlertTriangle,
    label: "Minor Drift",
  },
  "moderate-drift": {
    color: "text-orange-500",
    bg: "bg-orange-500/10 border-orange-500/20",
    badge: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
    icon: AlertCircle,
    label: "Moderate Drift",
  },
  "major-drift": {
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/20",
    badge: "bg-red-500/20 text-red-600 dark:text-red-400",
    icon: TrendingDown,
    label: "Major Drift",
  },
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-600 dark:text-red-400",
  medium: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  low: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
};

export function DriftPanel({ repoId, repoFullName, onRegenerate }: DriftPanelProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [report, setReport] = useState<DriftReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState(false);

  const owner = repoFullName.split("/")[0];
  const repo = repoFullName.split("/")[1];

  const handleCheck = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const res = await fetch("/api/drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Drift check failed");
        return;
      }

      if (data.status === "no_baseline") {
        setError(data.message);
        return;
      }

      setReport(data.driftReport);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const config = report
    ? STATUS_CONFIG[report.status] ?? STATUS_CONFIG["in-sync"]
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Documentation Drift
          </CardTitle>
          <div className="flex items-center gap-2">
            {report && (
              <Link
                href={`/repo/${owner}/${repo}/history`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                History
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheck}
              disabled={isChecking}
              className="gap-1.5"
            >
              {isChecking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isChecking ? "Checking..." : "Check Drift"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Initial state */}
        {!report && !error && !isChecking && (
          <p className="text-xs text-muted-foreground">
            Compare your current codebase against your README to detect outdated documentation.
          </p>
        )}

        {/* Loading */}
        {isChecking && (
          <div className="flex items-center gap-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Analyzing drift...</p>
              <p className="text-xs text-muted-foreground">Re-running analysis and comparing with your README</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isChecking && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Report */}
        {report && config && !isChecking && (
          <div className="space-y-4">
            {/* Score + Status */}
            <div className={`rounded-xl border p-4 ${config.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <config.icon className={`h-5 w-5 ${config.color}`} />
                  <span className={`text-sm font-semibold ${config.badge} px-2 py-0.5 rounded-full`}>
                    {config.label}
                  </span>
                </div>
                <span className={`text-3xl font-bold ${config.color}`}>
                  {report.drift_score}
                  <span className="text-base font-normal text-muted-foreground">/100</span>
                </span>
              </div>
              <p className="text-sm text-foreground/80">{report.summary}</p>
            </div>

            {/* Recommendation */}
            {report.recommendation && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <span className="font-medium shrink-0">→</span>
                {report.recommendation}
              </div>
            )}

            {/* Sections to update */}
            {report.sections_to_update.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Update:</span>
                {report.sections_to_update.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {/* Changed items */}
            {report.changed_items.length > 0 && (
              <div>
                <button
                  onClick={() => setExpandedItems(!expandedItems)}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  {expandedItems ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {report.changed_items.length} change
                  {report.changed_items.length !== 1 ? "s" : ""} detected
                </button>

                {expandedItems && (
                  <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    {report.changed_items.map((item, i) => (
                      <div
                        key={i}
                        className="rounded-lg border bg-muted/20 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.category}
                          </Badge>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low
                            }`}
                          >
                            {item.severity}
                          </span>
                        </div>
                        <p className="text-xs font-medium">{item.change}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.readme_impact}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Regenerate CTA */}
            {report.drift_score < 80 && onRegenerate && (
              <Button
                onClick={onRegenerate}
                size="sm"
                className="w-full gap-2"
                variant="outline"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate README to fix drift
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
