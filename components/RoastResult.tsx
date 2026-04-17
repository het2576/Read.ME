"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { signIn } from "next-auth/react";
import type { RoastResult } from "@/types";

// Grade color mapping
const gradeColors: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
  A: { bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/30", glow: "shadow-emerald-500/20" },
  B: { bg: "bg-green-500/10", text: "text-green-500", ring: "ring-green-500/30", glow: "shadow-green-500/20" },
  C: { bg: "bg-yellow-500/10", text: "text-yellow-500", ring: "ring-yellow-500/30", glow: "shadow-yellow-500/20" },
  D: { bg: "bg-orange-500/10", text: "text-orange-500", ring: "ring-orange-500/30", glow: "shadow-orange-500/20" },
  F: { bg: "bg-red-500/10", text: "text-red-500", ring: "ring-red-500/30", glow: "shadow-red-500/20" },
};

const criteriaLabels: Record<string, { label: string; icon: string }> = {
  clarity: { label: "Clarity", icon: "💡" },
  setup: { label: "Setup", icon: "🔧" },
  usage: { label: "Usage", icon: "📖" },
  structure: { label: "Structure", icon: "🏗️" },
  completeness: { label: "Completeness", icon: "✅" },
  specificity: { label: "Specificity", icon: "🎯" },
};

function ScoreBar({ score, maxScore = 10 }: { score: number; maxScore?: number }) {
  const percentage = (score / maxScore) * 100;
  const color =
    percentage >= 80 ? "bg-emerald-500" :
    percentage >= 60 ? "bg-green-500" :
    percentage >= 40 ? "bg-yellow-500" :
    percentage >= 20 ? "bg-orange-500" :
    "bg-red-500";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-mono font-medium w-8 text-right tabular-nums">
        {score}
      </span>
    </div>
  );
}

interface RoastResultProps {
  result: RoastResult;
  repoUrl: string;
}

export function RoastResultDisplay({ result, repoUrl }: RoastResultProps) {
  const [copied, setCopied] = useState(false);
  const [showAllCriteria, setShowAllCriteria] = useState(false);
  const colors = gradeColors[result.grade] || gradeColors.F;

  const handleShare = () => {
    const shareUrl = `${window.location.origin}?score=${result.grade}&repo=${encodeURIComponent(repoUrl.replace('https://github.com/', ''))}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const criteriaEntries = Object.entries(result.criteria);
  const visibleCriteria = showAllCriteria ? criteriaEntries : criteriaEntries.slice(0, 3);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Grade + Score Hero */}
      <Card className={`overflow-hidden border-0 shadow-2xl ${colors.glow}`}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
            {/* Letter Grade */}
            <div className={`relative flex items-center justify-center w-28 h-28 rounded-2xl ${colors.bg} ring-2 ${colors.ring}`}>
              <span className={`text-6xl font-black ${colors.text}`}>
                {result.grade}
              </span>
              <div className={`absolute -bottom-2 px-3 py-0.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
                {result.score}/100
              </div>
            </div>

            {/* Summary */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <p className="text-lg font-semibold leading-snug">
                {result.summary}
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Share Result
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criteria Breakdown */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Criteria Breakdown
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleCriteria.map(([key, value]) => {
            const meta = criteriaLabels[key] || { label: key, icon: "📝" };
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <span>{meta.icon}</span>
                    {meta.label}
                  </span>
                </div>
                <ScoreBar score={value.score} />
                {value.issue && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {value.issue}
                  </p>
                )}
              </div>
            );
          })}

          {criteriaEntries.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllCriteria(!showAllCriteria)}
              className="w-full text-xs text-muted-foreground"
            >
              {showAllCriteria ? (
                <>
                  <ChevronUp className="mr-1 h-3.5 w-3.5" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  Show All Criteria
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Top Issues */}
      {result.top_issues.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              Top Issues
            </h3>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.top_issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <Badge
                    variant="outline"
                    className="mt-0.5 shrink-0 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full"
                  >
                    {i + 1}
                  </Badge>
                  <span className="leading-relaxed">{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* CTA Card */}
      <Card className="border-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 shadow-lg">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Fix This Automatically
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Let AI analyze your code and generate an accurate README in 60
              seconds.
            </p>
          </div>
          <Button
            onClick={() => signIn("github")}
            className="shrink-0 font-semibold gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            Sign in to Fix
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
