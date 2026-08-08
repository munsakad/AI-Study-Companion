"use client";

import { useState } from "react";

type Point = { date: string; scorePercent: number; label?: string };

const W = 560;
const H = 180;
const PAD = { top: 16, right: 16, bottom: 24, left: 32 };
const OK = "#007a3d";
const WARN = "#b5862b";
// Read from CSS custom properties (see globals.css) so the chart follows
// the light/dark theme — Tailwind utility classes don't apply to SVG
// presentation attributes, but `var()` inside them does.
const LINE = "rgb(var(--chart-line))";
const GRID = "rgb(var(--chart-grid))";
const TEXT_MUTED = "rgb(var(--chart-text-muted))";
const TEXT = "rgb(var(--chart-text))";
const SURFACE = "rgb(var(--surface))";

/** Single-series score-over-time line chart. Dots are colored by the
 * pass/fail threshold (>=70%) — a status encoding, not series identity, so
 * no legend is needed (see dataviz skill: single series needs no legend
 * box, and status color always ships with a direct value alongside it). */
export default function ScoreTrendChart({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / 100) * plotH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.scorePercent)}`).join(" ");
  const gridValues = [0, 25, 50, 75, 100];
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score over time">
        {gridValues.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill={TEXT_MUTED}>{v}</text>
          </g>
        ))}

        <path d={path} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => {
          const color = p.scorePercent >= 70 ? OK : WARN;
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(p.scorePercent)} r={5} fill={color} stroke={SURFACE} strokeWidth={2} />
              {i === points.length - 1 && (
                <text x={x(i)} y={y(p.scorePercent) - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill={TEXT}>
                  {Math.round(p.scorePercent)}%
                </text>
              )}
              {/* generous invisible hit target, per dataviz interaction spec */}
              <rect
                x={x(i) - 12}
                y={PAD.top}
                width={24}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              />
            </g>
          );
        })}

        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke={LINE} strokeWidth={1} strokeDasharray="2,2" opacity={0.4} />}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute rounded-md bg-navy px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: `${(x(hover!) / W) * 100}%`, top: 0, transform: "translate(-50%, -110%)" }}
        >
          <span className="font-bold">{Math.round(active.scorePercent)}%</span>{" "}
          <span className="text-white/70">{active.label ?? new Date(active.date).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
