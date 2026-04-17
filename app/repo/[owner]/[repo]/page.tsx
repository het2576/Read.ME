"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AnalysisProgress, type AnalysisStep } from "@/components/AnalysisProgress";
import { ReadmeEditor } from "@/components/ReadmeEditor";
import { PrCreator } from "@/components/PrCreator";
import { DriftPanel } from "@/components/DriftPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Code2,
  FileText,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { RepoAnalysis } from "@/types";
import Link from "next/link";

export default function RepoWorkspacePage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("tree");
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [readmeId, setReadmeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasEverAnalyzed, setHasEverAnalyzed] = useState(false);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisStep("tree");

    // Simulate progress steps (actual work is server-side)
    const stepTimers = [
      setTimeout(() => setAnalysisStep("files"), 1500),
      setTimeout(() => setAnalysisStep("analyze"), 3500),
      setTimeout(() => setAnalysisStep("ai"), 5500),
    ];

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });

      // Clear step timers
      stepTimers.forEach(clearTimeout);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Analysis failed");
        setIsAnalyzing(false);
        return;
      }

      setAnalysisStep("save");
      const data = await res.json();

      setTimeout(() => {
        setAnalysisStep("done");
        setAnalysis(data.analysis);
        setAnalysisId(data.analysisId);
        setRepoId(data.repoId);
        setHasEverAnalyzed(true);
        setIsAnalyzing(false);
      }, 500);
    } catch {
      stepTimers.forEach(clearTimeout);
      setError("Analysis failed. Please try again.");
      setIsAnalyzing(false);
    }
  }, [owner, repo]);

  // Auto-trigger analysis if never analyzed
  useEffect(() => {
    if (!hasEverAnalyzed && !isAnalyzing && !analysis) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">
            {owner}/{repo}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {owner}/<span className="text-primary">{repo}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Repo workspace — analyze, generate, and manage documentation
            </p>
          </div>

          {!isAnalyzing && (
            <Button
              variant="outline"
              size="sm"
              onClick={runAnalysis}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-analyze
            </Button>
          )}
        </div>

        {/* Analysis in progress */}
        {isAnalyzing && (
          <Card className="mb-8">
            <CardContent className="py-8">
              <AnalysisProgress currentStep={analysisStep} />
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && !isAnalyzing && (
          <Card className="mb-8 border-destructive/50">
            <CardContent className="py-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={runAnalysis}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Analysis Complete → Show Results + Editor */}
        {analysis && !isAnalyzing && (
          <div className="space-y-6">
            {/* Collapsible Analysis Summary */}
            <Card
              className="border-emerald-500/20 bg-emerald-500/5 cursor-pointer"
              onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
            >
              <CardContent className="py-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Analysis complete</p>
                  <p className="text-xs text-muted-foreground">
                    {analysis.tech_stack.join(", ")} •{" "}
                    {analysis.project_type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {analysisId && (
                    <Badge variant="outline" className="text-xs">
                      ID: {analysisId.slice(0, 8)}
                    </Badge>
                  )}
                  {showAnalysisDetails ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expandable Analysis Details */}
            {showAnalysisDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Project Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code2 className="h-4 w-4" />
                      Project Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Language</span>
                      <span className="font-medium">{analysis.language}</span>
                    </div>
                    {analysis.framework && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Framework</span>
                        <span className="font-medium">{analysis.framework}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Package Manager</span>
                      <span className="font-medium">{analysis.package_manager}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="secondary" className="text-xs">
                        {analysis.project_type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Tech Stack */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Tech Stack
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.tech_stack.map((tech, i) => {
                        const label = typeof tech === 'string' ? tech : (tech as {name?: string}).name || String(tech);
                        return (
                          <Badge key={i} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                    {analysis.key_dependencies.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Key Dependencies
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.key_dependencies.slice(0, 10).map((dep, i) => {
                            const label = typeof dep === 'string' ? dep : (dep as {name?: string}).name || String(dep);
                            return (
                              <span
                                key={i}
                                className="text-xs bg-muted px-1.5 py-0.5 rounded"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* README Editor — auto-generates if no content */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  README.md
                </h2>
                {repoId && (
                  <PrCreator
                    repoId={repoId}
                    readmeId={readmeId}
                    repoFullName={`${owner}/${repo}`}
                  />
                )}
              </div>
              <ReadmeEditor
                repoId={repoId || ""}
                analysisId={analysisId || ""}
                onGenerated={(_, id) => id && setReadmeId(id)}
              />
            </div>

            {/* Drift Detection */}
            {repoId && (
              <DriftPanel
                repoId={repoId}
                repoFullName={`${owner}/${repo}`}
                onRegenerate={() => {
                  // Scroll to editor and trigger regeneration via re-render
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
