"use client";

import { useState } from "react";
import {
  GitPullRequest,
  CheckCircle2,
  ExternalLink,
  X,
  Loader2,
  GitBranch,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PrCreatorProps {
  repoId: string;
  readmeId?: string | null;
  repoFullName: string; // "owner/repo"
  defaultBranch?: string;
}

type PrStep = "idle" | "branch" | "upload" | "pr" | "done" | "error";

const STEP_LABELS: Record<PrStep, string> = {
  idle: "",
  branch: "Creating branch...",
  upload: "Uploading README.md...",
  pr: "Opening Pull Request...",
  done: "Pull Request created!",
  error: "Something went wrong",
};

export function PrCreator({
  repoId,
  readmeId,
  repoFullName,
  defaultBranch = "main",
}: PrCreatorProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PrStep>("idle");

  const repoName = repoFullName.split("/")[1] || repoFullName;
  const defaultBranchName = `repodoc/update-readme`;

  const [branchName, setBranchName] = useState(defaultBranchName);
  const [prTitle, setPrTitle] = useState(`docs: update README via RepoDoc`);
  const [prBody, setPrBody] = useState(
    `## What changed\n\nThis pull request updates the README.md with AI-generated documentation from [RepoDoc](https://repodoc.app).\n\n## Generated with\n- 🤖 AI model: Google Gemini\n- 📊 Based on: code analysis of ${repoName}\n- ✅ Includes: setup instructions, API routes, tech stack, environment variables`
  );

  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [prNumber, setPrNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedBranch, setUsedBranch] = useState<string | null>(null);

  const handleCreate = async () => {
    setStep("branch");
    setError(null);

    try {
      const res = await fetch("/api/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId,
          readmeId,
          branchName,
          prTitle,
          prBody,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create PR");
        setStep("error");
        return;
      }

      // Simulate step progress for UX
      setStep("upload");
      await new Promise((r) => setTimeout(r, 600));
      setStep("pr");
      await new Promise((r) => setTimeout(r, 600));

      setPrUrl(data.prUrl);
      setPrNumber(data.prNumber);
      setUsedBranch(data.branchName);
      setStep("done");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStep("error");
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (step === "done") {
      setStep("idle");
    }
  };

  const isLoading = step === "branch" || step === "upload" || step === "pr";

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0"
        size="sm"
      >
        <GitPullRequest className="h-3.5 w-3.5" />
        Raise PR 🚀
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && !isLoading && handleClose()}
        >
          {/* Modal */}
          <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-5 w-5 text-violet-500" />
                <h2 className="font-semibold text-base">Create Pull Request</h2>
                <Badge variant="outline" className="text-xs">
                  {repoFullName}
                </Badge>
              </div>
              {!isLoading && (
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {/* Success state */}
              {step === "done" ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">PR #{prNumber} Created! 🎉</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Branch <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{usedBranch}</code> →{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{defaultBranch}</code>
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button asChild className="gap-2">
                      <a href={prUrl!} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View on GitHub
                      </a>
                    </Button>
                    <Button variant="outline" onClick={handleClose}>
                      Done
                    </Button>
                  </div>
                </div>
              ) : step === "error" ? (
                /* Error state */
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">PR creation failed</p>
                      <p className="text-xs text-destructive/80 mt-1">{error}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setStep("idle")}
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={handleClose}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : isLoading ? (
                /* Loading state */
                <div className="text-center py-8 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-500" />
                  <div>
                    <p className="text-sm font-medium">{STEP_LABELS[step]}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This may take a few seconds
                    </p>
                  </div>
                  {/* Step indicators */}
                  <div className="flex items-center justify-center gap-3 mt-4">
                    {(["branch", "upload", "pr"] as PrStep[]).map((s) => (
                      <div
                        key={s}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          step === s
                            ? "text-violet-500 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${
                            step === s ? "bg-violet-500" : "bg-muted-foreground/30"
                          }`}
                        />
                        {s === "branch"
                          ? "Branch"
                          : s === "upload"
                          ? "Upload"
                          : "PR"}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Form state */
                <div className="space-y-4">
                  {/* Branch name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5" />
                      Branch Name
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 font-mono"
                      placeholder="repodoc/update-readme"
                    />
                  </div>

                  {/* PR Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      PR Title
                    </label>
                    <input
                      type="text"
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50"
                      placeholder="docs: update README via RepoDoc"
                    />
                  </div>

                  {/* PR body */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      PR Description
                    </label>
                    <textarea
                      value={prBody}
                      onChange={(e) => setPrBody(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 resize-none font-mono"
                    />
                  </div>

                  {/* Info */}
                  <p className="text-xs text-muted-foreground">
                    Will merge into{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">{defaultBranch}</code>.
                    A RepoDoc footer will be added automatically.
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={handleCreate}
                      disabled={!branchName || !prTitle}
                      className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0"
                    >
                      <GitPullRequest className="h-3.5 w-3.5" />
                      Create PR
                    </Button>
                    <Button variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
