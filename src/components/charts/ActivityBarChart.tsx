"use client";

import { useState } from "react";

type Day = { date: string; count: number };

const NAVY = "rgb(var(--chart-line))";
const GRID = "rgb(var(--chart-grid))";
const TEXT_MUTED = "rgb(var(--chart-text-muted))";

/** Daily study-activity bars (flashcard reviews + quiz attempts) over the
 * last N days. Single series measuring magnitude -> one hue, varying only
 * in opacity by count relative to the period max (a sequential encoding,
 * not a categorical one, so no palette validation is needed here). */
export default function ActivityBarChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (days.length === 0) return null;

  const W = 560;
  const H = 140;
  const PAD = { top: 8, right: 8, bottom: 20, left: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...days.map((d) => d.count));
  const barW = Math.min(20, plotW / days.length - 2);
  const gap = plotW / days.length;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Study activity over time">
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={GRID} strokeWidth={1} />
        {days.map((d, i) => {
          const h = (d.count / max) * (plotH - 4);
          const x = PAD.left + i * gap + (gap - barW) / 2;
          const y = PAD.top + plotH - h;
          const showLabel = days.length <= 14 || i % Math.ceil(days.length / 10) === 0;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={y} width={barW} height={Math.max(2, h)} rx={3} fill={NAVY} opacity={d.count === 0 ? 0.08 : hover === i ? 1 : 0.55} />
              {showLabel && (
                <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill={TEXT_MUTED}>
                  {new Date(d.date).toLocaleDateString(undefined, { day: "numeric", month: "short" }).replace(" ", "")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute rounded-md bg-navy px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: `${((hover + 0.5) / days.length) * 100}%`, top: 0, transform: "translate(-50%, -110%)" }}
        >
          <span className="font-bold">{days[hover].count}</span> <span className="text-white/70">{new Date(days[hover].date).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
