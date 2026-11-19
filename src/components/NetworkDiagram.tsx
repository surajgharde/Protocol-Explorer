"use client";

import { useMemo } from "react";
import type { Packet, Protocol } from "@/data/types";
import { kindColor } from "@/lib/packetKinds";
import {
  buildAdjacency,
  pointAlong,
  routeBetween,
  wireKey,
  type Point,
} from "@/lib/routing";
import { NodeGlyph } from "./NodeGlyph";

/**
 * Every device sits on a disc of this radius. Links are trimmed to it so a
 * wire stops cleanly at the edge of a device instead of running under it, and
 * the glyphs all share one silhouette however differently they are drawn.
 */
const NODE_R = 42;
/** Gap left between the end of a wire and the disc it points at. */
const WIRE_GAP = 5;

/** Clearance around a disc, and the room its two label lines need below it. */
const PAD_X = 84;
const PAD_TOP = 62;
const PAD_BOTTOM = 100;

/** Shorten a segment at both ends so it meets the discs rather than the centres. */
function trim(a: Point, b: Point, by: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  // Two devices closer together than their own discs: draw the full segment
  // and let the discs cover it rather than producing a backwards line.
  if (d <= by * 2 + 2) return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  const ux = (dx / d) * by;
  const uy = (dy / d) * by;
  return { x1: a.x + ux, y1: a.y + uy, x2: b.x - ux, y2: b.y - uy };
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
    const at = pointAlong(points, progress);
    /** The wires this packet is using, so they can light up in its colour. */
    const wires = new Set(route.slice(1).map((id, i) => wireKey(route[i], id)));
    return { ...at, wires, color: kindColor(packet.kind), packet };
  }, [flight, adjacency, positions]);

  const label = motion?.packet.label ?? "";

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="map-svg"
      role="img"
      aria-label={`Network map for ${protocol.name}`}
    >
      <defs>
        <pattern id="bp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 17v6M17 20h6" stroke="var(--grid)" strokeWidth="1.2" />
        </pattern>
        {/* A faint wash toward the middle, so the map sits on the panel rather
            than floating on a flat field of grid. */}
        <radialGradient id="bp-wash" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="var(--map-wash)" />
          <stop offset="100%" stopColor="var(--map-wash-edge)" />
        </radialGradient>
      </defs>

      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#bp-grid)" />
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#bp-wash)" />

      {/* --- wires, under everything -------------------------------------- */}
      <g>
        {protocol.links.map((link, i) => {
          const a = positions.get(link.from);
          const b = positions.get(link.to);
          if (!a || !b) return null;
          const seg = trim(a, b, NODE_R + WIRE_GAP);
          const live = motion?.wires.has(wireKey(link.from, link.to)) ?? false;
          return (
            <g key={i}>
              <line className="link-bed" {...seg} />
              <line
                {...seg}
                className={`link-line${link.style === "dashed" ? " is-dashed" : ""}${
                  live ? " is-live" : ""
                }`}
                style={live && motion ? { stroke: motion.color } : undefined}
              />
            </g>
          );
        })}
      </g>

      {/* The travelled portion of the current packet's route. */}
      {motion && (
        <polyline
          className="packet-trail"
          points={motion.trail.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke={motion.color}
        />
      )}

      {/* --- devices ------------------------------------------------------ */}
      <g>
        {protocol.nodes.map((node) => {
          const isActive = active ? active.from === node.id || active.to === node.id : false;
          return (
            <g
              key={node.id}
              className={`node-group${isActive ? " is-active" : ""}`}
              transform={`translate(${node.x} ${node.y})`}
            >
              <circle className="node-halo" r={NODE_R + 7} />
              <circle className="node-disc" r={NODE_R} />
              {isActive && <circle className="node-pulse" r={NODE_R} />}

              <NodeGlyph kind={node.kind} />

              <text className="node-label" textAnchor="middle" y={NODE_R + 24}>
                {node.label}
              </text>
              {node.sublabel && (
                <text className="node-sub" textAnchor="middle" y={NODE_R + 40}>
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* --- the packet in flight ----------------------------------------- */}
      {motion && (
        <g transform={`translate(${motion.x} ${motion.y})`}>
          <circle className="packet-halo" r="16" fill={motion.color} />
          <circle r="7.5" fill={motion.color} />
          <circle className="packet-gloss" cx="-2.4" cy="-2.8" r="2.4" />
          <g transform={`translate(0 ${motion.y > box.y + box.h / 2 ? -26 : 28})`}>
            <rect
              x={-(label.length * 3.4 + 9)}
              y="-10"
              width={label.length * 6.8 + 18}
              height="19"
              rx="3"
              fill={motion.color}
            />
            <text className="packet-label" textAnchor="middle" y="3.5" fill="#fff">
              {label}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
