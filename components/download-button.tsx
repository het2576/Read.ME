"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DownloadButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  content: string;
  filename: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DownloadButton({
  content,
  filename,
  className,
  variant = "outline",
  size = "sm",
  ...props
}: DownloadButtonProps) {
  const downloadFile = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={downloadFile}
      {...props}
    >
      <Download className="h-4 w-4" />
      <span className="sr-only">Download</span>
    </Button>
  );
}