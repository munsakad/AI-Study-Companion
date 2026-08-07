"use client";

import { useState } from "react";

type Bar = { topic: string; scorePercent: number };

const OK = "#007a3d";
const WARN = "#b5862b";
const ROW_H = 28;
const GAP = 8;

/** Horizontal bars, one per topic, colored by the same ok/warn threshold
 * used everywhere else in the app. Color here is a status encoding (not
 * series identity) and is backed by the bar length + printed % — never
 * color alone. */
export default function MasteryBarChart({ bars }: { bars: Bar[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (bars.length === 0) return null;

  const W = 560;
  const labelW = 120;
  const trackW = W - labelW - 48;
  const H = bars.length * (ROW_H + GAP);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Average score by topic">
      {bars.map((b, i) => {
        const y = i * (ROW_H + GAP);
        const w = Math.max(4, (b.scorePercent / 100) * trackW);
        const color = b.scorePercent >= 70 ? OK : WARN;
        const isHover = hover === i;
        return (
          <g key={b.topic} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <text x={labelW - 8} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={12} fontWeight={600} fill="#333333">
              {b.topic.length > 16 ? b.topic.slice(0, 15) + "…" : b.topic}
            </text>
            <rect x={labelW} y={y} width={trackW} height={ROW_H} rx={4} fill="#f4f6f8" />
            <rect x={labelW} y={y} width={w} height={ROW_H} rx={4} fill={color} opacity={isHover ? 1 : 0.9} />
            <text x={labelW + w + 8} y={y + ROW_H / 2 + 4} fontSize={12} fontWeight={700} fill="#333333">
              {Math.round(b.scorePercent)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
