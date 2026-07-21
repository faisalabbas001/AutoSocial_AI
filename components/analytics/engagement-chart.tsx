"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

export interface PlatformDatum {
  platform: string;
  views: number;
}

const COLORS: Record<string, string> = {
  INSTAGRAM: "#e1306c",
  FACEBOOK: "#1877f2",
  TIKTOK: "#111827",
  YOUTUBE: "#ff0000",
  LINKEDIN: "#0a66c2",
};

export function EngagementChart({ data }: { data: PlatformDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="platform" tick={{ fontSize: 12, fill: "#6b6b7b" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#6b6b7b" }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: "rgba(99,102,241,0.06)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #e6e6ee", fontSize: 13 }}
        />
        <Bar dataKey="views" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.platform} fill={COLORS[d.platform] ?? "#6366f1"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
