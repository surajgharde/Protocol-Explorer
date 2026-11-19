"use client";

import { useMemo } from "react";
import type { Packet, Protocol } from "@/data/types";
import { kindColor } from "@/lib/packetKinds";
import {
  buildAdjacency,
  pointAlong,
  routeBetween,
  type Point,
} from "@/lib/routing";
import { NodeGlyph } from "./NodeGlyph";

/** Clearance around a glyph, and the room its two label lines need below it. */
const PAD_X = 78;
const PAD_TOP = 48;
const PAD_BOTTOM = 76;

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

  const adjacency = useMemo(
    () => buildAdjacency(protocol.links, (id) => positions.has(id)),
    [protocol, positions],
  );

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
