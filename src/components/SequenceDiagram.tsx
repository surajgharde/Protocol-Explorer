"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Packet, Protocol } from "@/data/types";
import { formatTime, kindColor } from "@/lib/packetKinds";

const VIEW_W = 1000;
const HEAD_H = 52;
const ROW_H = 58;
const GUTTER = 150;
const RIGHT_PAD = 50;
const STEP_GAP = 28;

export function SequenceDiagram({
  protocol,
  delivered,
  flight,
  currentIndex,
}: {
  protocol: Protocol;
  delivered: number;
  flight: { packet: Packet; index: number; progress: number } | null;
  currentIndex: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  /** Lifelines, in map order, for every device that actually sends or receives. */
  const columns = useMemo(() => {
    const involved = new Set<string>();
    for (const p of protocol.packets) {
      involved.add(p.from);
      involved.add(p.to);
    }
    const participants = protocol.nodes.filter((n) => involved.has(n.id));
    const span = VIEW_W - GUTTER - RIGHT_PAD;
    const step = participants.length > 1 ? span / (participants.length - 1) : 0;
    return participants.map((node, i) => ({
      node,
      x: participants.length > 1 ? GUTTER + step * i : GUTTER + span / 2,
    }));
  }, [protocol]);

  const columnX = useMemo(() => new Map(columns.map((c) => [c.node.id, c.x])), [columns]);

  /**
   * Lay rows out top to bottom, inserting a labelled divider whenever the
   * capture moves into a new conceptual step.
   */
  const rows = useMemo(() => {
    let y = 26;
    let lastStep = -1;
    return protocol.packets.map((packet, index) => {
      const divider = packet.step !== lastStep ? packet.step : null;
      if (divider !== null) y += STEP_GAP;
      lastStep = packet.step;
      const row = { packet, index, y, divider };
      y += ROW_H;
      return row;
    });
  }, [protocol]);

  const bodyH = (rows.at(-1)?.y ?? 0) + ROW_H;

  // Follow the capture as it plays.
  useEffect(() => {
    const box = scroller.current;
    const row = rows[currentIndex];
    if (!box || !row) return;
    const scale = box.clientWidth / VIEW_W;
    box.scrollTo({
      top: Math.max(0, row.y * scale - box.clientHeight / 2),
      behavior: "smooth",
    });
  }, [currentIndex, rows]);

  return (
    <div className="diagram-body" ref={scroller} style={{ overflowY: "auto" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${HEAD_H}`}
        preserveAspectRatio="xMinYMin meet"
        style={{
          width: "100%",
          height: "auto",
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "var(--panel)",
        }}
        aria-hidden="true"
      >
        {columns.map((col) => (
          <g key={col.node.id}>
            <text className="seq-head" x={col.x} y={20} textAnchor="middle">
              {col.node.label}
            </text>
            {col.node.sublabel && (
              <text className="seq-sub" x={col.x} y={36} textAnchor="middle">
                {col.node.sublabel}
              </text>
            )}
          </g>
        ))}
        <line className="seq-step-rule" x1={0} y1={HEAD_H - 1} x2={VIEW_W} y2={HEAD_H - 1} />
      </svg>

      <svg
        viewBox={`0 0 ${VIEW_W} ${bodyH}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`Sequence diagram for ${protocol.name}`}
      >
        {columns.map((col) => (
          <line
            key={col.node.id}
            className="seq-lifeline"
            x1={col.x}
            y1={0}
            x2={col.x}
            y2={bodyH}
          />
        ))}

        {rows.map((row) => {
          if (row.divider === null) return null;
          const step = protocol.steps[row.divider];
          return (
            <g key={`step-${row.index}`}>
              <line
                className="seq-step-rule"
                x1={12}
                y1={row.y - STEP_GAP + 6}
                x2={VIEW_W - 12}
                y2={row.y - STEP_GAP + 6}
              />
              <text className="seq-step-label" x={12} y={row.y - STEP_GAP - 2}>
                {`STEP ${row.divider + 1} · ${step?.title.toUpperCase() ?? ""}`}
              </text>
            </g>
          );
        })}

        {rows.map((row) => {
          const visible = row.index < delivered;
          const inFlight = flight?.index === row.index;
          if (!visible && !inFlight) return null;

          const from = columnX.get(row.packet.from);
          const to = columnX.get(row.packet.to);
          if (from === undefined || to === undefined) return null;

          const progress = inFlight ? flight.progress : 1;
          const tip = from + (to - from) * progress;
          const color = kindColor(row.packet.kind);
          const forward = to > from;
          const selfCall = from === to;
          const isCurrent = row.index === currentIndex;

          return (
            <g key={row.index}>
              <text className="seq-time" x={12} y={row.y + 4}>
                {formatTime(row.packet.t)}
              </text>

              {selfCall ? (
                <path
                  d={`M${from} ${row.y - 10} h34 v20 h-34`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isCurrent ? 2.4 : 1.8}
                />
              ) : (
                <line
                  x1={from}
                  y1={row.y}
                  x2={tip}
                  y2={row.y}
                  stroke={color}
                  strokeWidth={isCurrent ? 2.4 : 1.8}
                />
              )}

              <circle cx={from} cy={row.y} r="3.4" fill={color} />

              {progress > 0.04 && !selfCall && (
                <path
                  d={forward ? `M${tip} ${row.y} l-9 -5 v10 Z` : `M${tip} ${row.y} l9 -5 v10 Z`}
                  fill={color}
                />
              )}

              <text
                className="packet-label"
                x={selfCall ? from + 44 : (from + tip) / 2}
                y={row.y - 10}
                textAnchor={selfCall ? "start" : "middle"}
                fill={color}
              >
                {row.packet.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
