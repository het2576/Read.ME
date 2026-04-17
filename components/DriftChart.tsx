"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface DriftPoint {
  date: string;
  score: number;
  status: "in-sync" | "minor-drift" | "moderate-drift" | "major-drift";
}

interface DriftChartProps {
  data: DriftPoint[];
}

const STATUS_LABELS: Record<string, string> = {
  "in-sync": "In Sync",
  "minor-drift": "Minor Drift",
  "moderate-drift": "Moderate Drift",
  "major-drift": "Major Drift",
};

function scoreToColor(score: number): string {
  if (score >= 90) return "#10b981"; // emerald
  if (score >= 70) return "#eab308"; // yellow
  if (score >= 40) return "#f97316"; // orange
  return "#ef4444"; // red
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const score = payload[0].value as number;
  const status = payload[0].payload?.status as string;

  return (
    <div className="rounded-lg border bg-background shadow-lg px-3 py-2 text-sm">
      <p className="text-xs text-muted-foreground mb-1">
        {new Date(label).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <p className="font-semibold" style={{ color: scoreToColor(score) }}>
        Score: {score}/100
      </p>
      <p className="text-xs text-muted-foreground">{STATUS_LABELS[status] || status}</p>
    </div>
  );
}

export function DriftChart({ data }: DriftChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
        <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Run your first drift check to start tracking
        </p>
        <p className="text-xs text-muted-foreground/60">
          History will appear here after each drift scan
        </p>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    dateFormatted: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="dateFormatted"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
          width={32}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Reference lines */}
        <ReferenceLine
          y={90}
          stroke="#10b981"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{ value: "In Sync", position: "right", fontSize: 10, fill: "#10b981" }}
        />
        <ReferenceLine
          y={70}
          stroke="#eab308"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{ value: "Minor", position: "right", fontSize: 10, fill: "#eab308" }}
        />
        <ReferenceLine
          y={40}
          stroke="#f97316"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{ value: "Moderate", position: "right", fontSize: 10, fill: "#f97316" }}
        />

        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={(props) => {
            const score = props.payload?.score as number;
            return (
              <circle
                key={props.cx}
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill={scoreToColor(score)}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
