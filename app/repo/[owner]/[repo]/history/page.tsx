"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { DriftChart } from "@/components/DriftChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  BarChart3,
} from "lucide-react";

interface DriftPoint {
  date: string;
  score: number;
  status: "in-sync" | "minor-drift" | "moderate-drift" | "major-drift";
}

const STATUS_CONFIG = {
  "in-sync":        { label: "In Sync",        className: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  "minor-drift":    { label: "Minor Drift",    className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
  "moderate-drift": { label: "Moderate Drift", className: "bg-orange-500/20 text-orange-600 dark:text-orange-400" },
  "major-drift":    { label: "Major Drift",    className: "bg-red-500/20 text-red-600 dark:text-red-400" },
};

export default function DriftHistoryPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const [history, setHistory] = useState<DriftPoint[]>([]);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch repoId from repos API, then drift history
  useEffect(() => {
    const load = async () => {
      try {
        // 1. Get repos to find repoId
        const reposRes = await fetch("/api/repos");
        if (!reposRes.ok) throw new Error("Failed to load repos");
        const reposData = await reposRes.json();
        const match = reposData.repos?.find(
          (r: { owner: string; name: string; id: string }) =>
            r.owner === owner && r.name === repo
        );

        if (!match) {
          setError("Repository not found. Analyze it first.");
          return;
        }

        setRepoId(match.id);

        // 2. Fetch drift history
        const histRes = await fetch(`/api/drift/history?repoId=${match.id}`);
        if (!histRes.ok) throw new Error("Failed to load drift history");
        const histData = await histRes.json();
        setHistory(histData.history || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, repo]);

  const avgScore =
    history.length > 0
      ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / history.length)
      : null;

  const latestScore = history.length > 0 ? history[history.length - 1].score : null;
  const latestStatus = history.length > 0 ? history[history.length - 1].status : null;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href={`/repo/${owner}/${repo}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {owner}/{repo}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">Drift History</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Documentation Drift History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track how in-sync your README has been with your codebase over time
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Latest Score</p>
                    <p className="text-2xl font-bold">
                      {latestScore ?? "—"}
                      {latestScore !== null && (
                        <span className="text-sm font-normal text-muted-foreground">/100</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">
                      {avgScore ?? "—"}
                      {avgScore !== null && (
                        <span className="text-sm font-normal text-muted-foreground">/100</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Checks</p>
                    <p className="text-2xl font-bold">{history.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Drift Score Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <DriftChart data={history} />
              </CardContent>
            </Card>

            {/* History table */}
            {history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Check History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[...history].reverse().map((point, i) => {
                      const cfg = STATUS_CONFIG[point.status] ?? STATUS_CONFIG["in-sync"];
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-6 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold w-10 text-right">
                              {point.score}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(point.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
