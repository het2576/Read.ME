"use client";

import { Check, Loader2 } from "lucide-react";

const STEPS = [
  { key: "tree", label: "Fetching file tree" },
  { key: "files", label: "Reading key files" },
  { key: "analyze", label: "Analyzing code structure" },
  { key: "ai", label: "Running AI analysis" },
  { key: "save", label: "Saving results" },
];

export type AnalysisStep = "tree" | "files" | "analyze" | "ai" | "save" | "done";

interface AnalysisProgressProps {
  currentStep: AnalysisStep;
  fileCount?: number;
}

export function AnalysisProgress({ currentStep, fileCount }: AnalysisProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const isDone = currentStep === "done";

  return (
    <div className="w-full max-w-md mx-auto space-y-3 p-6">
      <h3 className="text-sm font-semibold text-center mb-4 text-muted-foreground uppercase tracking-wider">
        {isDone ? "Analysis Complete" : "Analyzing Repository..."}
      </h3>

      {STEPS.map((step, index) => {
        const isComplete = isDone || index < currentIndex;
        const isCurrent = !isDone && index === currentIndex;
        const isPending = !isDone && index > currentIndex;

        return (
          <div
            key={step.key}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${
              isCurrent
                ? "bg-primary/5 border border-primary/20"
                : isComplete
                ? "opacity-60"
                : "opacity-30"
            }`}
          >
            {/* Icon */}
            <div className="shrink-0">
              {isComplete ? (
                <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </div>
              ) : isCurrent ? (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground font-medium">
                    {index + 1}
                  </span>
                </div>
              )}
            </div>

            {/* Label */}
            <span
              className={`text-sm ${
                isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
              {isCurrent && step.key === "files" && fileCount
                ? ` (${fileCount} files)`
                : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
