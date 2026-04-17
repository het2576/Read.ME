"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { RepoCard } from "@/components/RepoCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FolderGit2,
  Sparkles,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
import type { GitHubRepo } from "@/types";

interface EnrichedRepo extends GitHubRepo {
  last_analyzed_at: string | null;
}

/* ── Skeleton loader for repo grid ──────────────────────────────── */
function RepoCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 w-36 bg-muted/60 rounded" />
        <div className="h-5 w-16 bg-muted/40 rounded-full" />
      </div>
      <div className="h-3 w-full bg-muted/40 rounded mb-2" />
      <div className="h-3 w-2/3 bg-muted/40 rounded mb-5" />
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-muted/40 rounded-full" />
        <div className="h-5 w-24 bg-muted/40 rounded-full" />
      </div>
    </div>
  );
}

function RepoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <RepoCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Dashboard page ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<EnrichedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("/api/repos");
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to fetch repos");
          return;
        }
        const data = await res.json();
        setRepos(data);
      } catch {
        setError("Failed to fetch repos. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchRepos();
  }, []);

  const filteredRepos = repos.filter(
    (repo) =>
      repo.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (repo.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const analyzedCount = repos.filter((r) => r.last_analyzed_at).length;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="h-5 w-5 text-violet-400" />
              <h1 className="text-2xl font-bold tracking-tight">Your Repositories</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Select a repository to analyze and generate documentation.
              {!loading && repos.length > 0 && (
                <span className="ml-1">
                  <Badge variant="outline" className="ml-2 text-xs border-violet-500/30 text-violet-400">
                    {analyzedCount} / {repos.length} analyzed
                  </Badge>
                </span>
              )}
            </p>
          </div>

          {!loading && repos.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              {repos.length} repos synced from GitHub
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-background/50 border-white/10 focus:border-violet-500/40"
          />
        </div>

        {/* Loading skeletons */}
        <Suspense fallback={<RepoGridSkeleton />}>
          {loading && <RepoGridSkeleton />}
        </Suspense>

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="glass-card rounded-xl p-6 flex flex-col items-center gap-3 max-w-sm">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-center text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredRepos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl glass-card flex items-center justify-center">
              <FolderGit2 className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="font-medium mb-1">
                {search ? "No repos match your search" : "No repositories found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "Try a different search term."
                  : "Make sure your GitHub account has repositories."}
              </p>
            </div>
          </div>
        )}

        {/* Repo grid */}
        {!loading && !error && filteredRepos.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepos.map((repo) => (
                <RepoCard
                  key={repo.id}
                  fullName={repo.full_name}
                  owner={repo.owner}
                  name={repo.name}
                  isPrivate={repo.is_private}
                  description={repo.description}
                  updatedAt={repo.updated_at}
                  lastAnalyzedAt={repo.last_analyzed_at}
                  onClick={() => router.push(`/repo/${repo.owner}/${repo.name}`)}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-8">
              Showing{" "}
              <span className="text-foreground font-medium">{filteredRepos.length}</span> of{" "}
              <span className="text-foreground font-medium">{repos.length}</span> repositories
            </p>
          </>
        )}
      </div>
    </main>
  );
}
