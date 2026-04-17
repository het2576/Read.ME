"use client";

import { Lock, Globe, Clock, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RepoCardProps {
  fullName: string;
  owner: string;
  name: string;
  isPrivate: boolean;
  description: string | null;
  updatedAt: string;
  lastAnalyzedAt: string | null;
  onClick: () => void;
}

export function RepoCard({
  fullName,
  isPrivate,
  description,
  updatedAt,
  lastAnalyzedAt,
  onClick,
}: RepoCardProps) {
  const timeAgo = getTimeAgo(updatedAt);
  const analyzedAgo = lastAnalyzedAt ? getTimeAgo(lastAnalyzedAt) : null;

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer border hover:border-primary/30 hover:shadow-md transition-all duration-200 bg-card/50 hover:bg-card"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {isPrivate ? (
              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <h3 className="font-semibold text-sm truncate">{fullName}</h3>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>

          {lastAnalyzedAt ? (
            <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
              Analyzed {analyzedAgo}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-2 py-0 h-5 text-muted-foreground">
              Not analyzed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}
