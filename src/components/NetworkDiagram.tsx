"use client";

import { useMemo } from "react";
import type { Packet, Protocol } from "@/data/types";
import { kindColor } from "@/lib/packetKinds";
import { NodeGlyph } from "./NodeGlyph";

/** Clearance around a glyph, and the room its two label lines need below it. */
const PAD_X = 78;
const PAD_TOP = 48;
const PAD_BOTTOM = 76;

type Point = { x: number; y: number };

/**
 * Shortest path through the drawn links, so a packet follows the wires rather
 * than cutting across the map. Falls back to a straight line when the two
 * devices are not connected in the diagram.
 */
function routeBetween(
  from: string,
  to: string,
  adjacency: Map<string, string[]>,
): string[] {
  if (from === to) return [from];
  const queue: string[][] = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift()!;
    const tail = path[path.length - 1];
    for (const next of adjacency.get(tail) ?? []) {
      if (seen.has(next)) continue;
      if (next === to) return [...path, next];
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return [from, to];
}

/** Position and heading at `progress` along a polyline, measured by arc length. */
function pointAlong(points: Point[], progress: number) {
  const spans = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = spans.reduce((a, b) => a + b, 0);
  if (total === 0) return { ...points[0], angle: 0, trail: [points[0]] };

  let remaining = progress * total;
  for (let i = 0; i < spans.length; i++) {
    if (remaining <= spans[i] || i === spans.length - 1) {
      const ratio = spans[i] === 0 ? 0 : Math.min(1, remaining / spans[i]);
      const a = points[i];
      const b = points[i + 1];
      const here = { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
      return {
        ...here,
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
        trail: [...points.slice(0, i + 1), here],
      };
    }
    remaining -= spans[i];
  }
  return { ...points[points.length - 1], angle: 0, trail: points };
}

export function NetworkDiagram({
  protocol,
  flight,
  lastPacket,
}: {
  protocol: Protocol;
  flight: { packet: Packet; progress: number } | null;
  lastPacket: Packet | null;
}) {
  const positions = useMemo(
    () => new Map(protocol.nodes.map((n) => [n.id, { x: n.x, y: n.y }])),
    [protocol],
  );

  const adjacency = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const link of protocol.links) {
      if (!positions.has(link.from) || !positions.has(link.to)) continue;
      map.set(link.from, [...(map.get(link.from) ?? []), link.to]);
      map.set(link.to, [...(map.get(link.to) ?? []), link.from]);
    }
    return map;
  }, [protocol, positions]);

  /**
   * Fit the viewBox to the devices actually on screen. Topologies vary from two
   * nodes to six, and a fixed box would leave half the panel empty for the
   * small ones.
   */
  const box = useMemo(() => {
    const xs = protocol.nodes.map((n) => n.x);
    const ys = protocol.nodes.map((n) => n.y);
    const minX = Math.min(...xs) - PAD_X;
    const minY = Math.min(...ys) - PAD_TOP;
    return {
      x: minX,
      y: minY,
      w: Math.max(...xs) + PAD_X - minX,
      h: Math.max(...ys) + PAD_BOTTOM - minY,
    };
  }, [protocol]);

  const active = flight?.packet ?? lastPacket;

  const motion = useMemo(() => {
    if (!flight) return null;
    const { packet, progress } = flight;
    const route = routeBetween(packet.from, packet.to, adjacency);
    const points = route.map((id) => positions.get(id)).filter(Boolean) as Point[];
    if (points.length < 2) return null;
    return { ...pointAlong(points, progress), color: kindColor(packet.kind), packet };
  }, [flight, adjacency, positions]);

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Network map for ${protocol.name}`}
    >
      <defs>
        <pattern id="bp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 17v6M17 20h6" stroke="var(--grid)" strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#bp-grid)" />

      {/* Links first, so devices sit on top of them. */}
      <g>
        {protocol.links.map((link, i) => {
          const a = positions.get(link.from);
          const b = positions.get(link.to);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`link-line${link.style === "dashed" ? " is-dashed" : ""}`}
            />
          );
        })}
      </g>

      {/* The travelled portion of the current packet's route. */}
      {motion && (
        <polyline
          points={motion.trail.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={motion.color}
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.55"
        />
      )}

      <g>
        {protocol.nodes.map((node) => {
          const isActive = active ? active.from === node.id || active.to === node.id : false;
          return (
            <g
              key={node.id}
              className={`node-group${isActive ? " is-active" : ""}`}
              transform={`translate(${node.x} ${node.y})`}
            >
              <NodeGlyph kind={node.kind} />
              <text className="node-label" textAnchor="middle" y={48}>
                {node.label}
              </text>
              {node.sublabel && (
                <text className="node-sub" textAnchor="middle" y={63}>
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* The packet in flight. */}
      {motion && (
        <g transform={`translate(${motion.x} ${motion.y})`}>
          <circle r="13" fill={motion.color} opacity="0.18" />
          <circle r="6.5" fill={motion.color} />
          <g transform={`translate(0 ${motion.y > box.y + box.h / 2 ? -22 : 24})`}>
            <rect
              x={-(motion.packet.label.length * 3.4 + 9)}
              y="-10"
              width={motion.packet.label.length * 6.8 + 18}
              height="19"
              rx="2.5"
              fill={motion.color}
            />
            <text
              className="packet-label"
              textAnchor="middle"
              y="3.5"
              fill="#fff"
            >
              {motion.packet.label}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
