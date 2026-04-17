"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  Download,
  RefreshCw,
  Loader2,
  FileText,
  Eye,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ReadmeEditorProps {
  repoId: string;
  analysisId: string;
  initialContent?: string;
  initialVersion?: number;
  initialReadmeId?: string;
  onGenerated?: (content: string, readmeId?: string | null) => void;
}

export function ReadmeEditor({
  repoId,
  analysisId,
  initialContent,
  initialVersion,
  onGenerated,
}: ReadmeEditorProps) {
  const [content, setContent] = useState(initialContent || "");
  const [version, setVersion] = useState(initialVersion || 0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("preview");

  // Debounced preview — 300ms delay
  const [previewContent, setPreviewContent] = useState(content);
  useEffect(() => {
    const timer = setTimeout(() => setPreviewContent(content), 300);
    return () => clearTimeout(timer);
  }, [content]);

  // Auto-generate if no initial content and we have valid IDs
  useEffect(() => {
    if (!initialContent && repoId && analysisId) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId, analysisId]);

  const handleGenerate = useCallback(async () => {
    if (!repoId || !analysisId) return; // Don't fire with empty IDs

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId, analysisId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Only set error if we have NO existing content
        if (!content) {
          setError(data.error || "Generation failed");
        }
        return;
      }

      setContent(data.content);
      setPreviewContent(data.content);
      setVersion(data.version);
      setError(null); // Clear any previous errors on success
      onGenerated?.(data.content, data.readmeId ?? null);
    } catch {
      // Only set error if we have NO existing content
      if (!content) {
        setError("Generation failed. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [repoId, analysisId, onGenerated, content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generating state
  if (isGenerating) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-sm font-medium">Generating README...</p>
        <p className="text-xs text-muted-foreground mt-1">
          AI is writing documentation based on your code analysis
        </p>
      </Card>
    );
  }

  // Error state — ONLY show when there's no content at all
  if (error && !content) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={handleGenerate}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </Card>
    );
  }

  // No content yet
  if (!content) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground mb-3">
          No README generated yet.
        </p>
        <Button onClick={handleGenerate} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Generate README
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Tab toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "edit"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          </div>

          {version > 0 && (
            <Badge variant="secondary" className="text-xs">
              Version {version}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1.5" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerate}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Editor / Preview Pane */}
      <div className="min-h-[600px]">
        {/* Edit Mode */}
        {activeTab === "edit" && (
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[600px] p-4 text-sm font-mono bg-muted/30 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview Mode */}
        {activeTab === "preview" && (
          <div className="h-[600px] overflow-auto border rounded-xl bg-background">
            <div className="p-6 md:p-8 readme-preview">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom heading renderers with proper sizing
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mb-4 pb-3 border-b border-border">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mt-8 mb-3 pb-2 border-b border-border/50">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-2">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-medium mt-4 mb-2">
                      {children}
                    </h4>
                  ),
                  // Paragraphs
                  p: ({ children }) => (
                    <p className="text-sm leading-relaxed mb-4 text-foreground/90">
                      {children}
                    </p>
                  ),
                  // Blockquotes for descriptions
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-4 my-4 text-muted-foreground italic">
                      {children}
                    </blockquote>
                  ),
                  // Code blocks
                  pre: ({ children }) => (
                    <pre className="bg-muted rounded-lg p-4 my-4 overflow-x-auto text-sm">
                      {children}
                    </pre>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-muted text-primary px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="text-foreground font-mono text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Links
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  // Lists
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1.5 mb-4 text-sm text-foreground/90 pl-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1.5 mb-4 text-sm text-foreground/90 pl-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  // Tables
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full text-sm border-collapse border border-border rounded-lg">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/50">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-3 py-2 text-sm">
                      {children}
                    </td>
                  ),
                  // Horizontal rules
                  hr: () => <hr className="my-6 border-border" />,
                  // Images (badges)
                  img: ({ src, alt }) => (
                    <img
                      src={src}
                      alt={alt || ""}
                      className="inline-block h-5 mr-1"
                    />
                  ),
                  // Strong/Bold
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                }}
              >
                {previewContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
