"use client";

import { useMemo } from "react";
import type { Packet, Protocol } from "@/data/types";
import { kindColor } from "@/lib/packetKinds";
import {
  buildAdjacency,
  hopAlong,
  routeBetween,
  wireKey,
  type Point,
} from "@/lib/routing";
import { IsoGlyph, glyphReach } from "./IsoGlyph";

/** Gap left between the end of a wire and the device it points at. */
const WIRE_GAP = 8;
/** Peak height of a packet's arc as it crosses one wire. */
const HOP = 34;

/**
 * Clearance around the floor plan. The top needs the most: devices are drawn
 * standing up from their node, so a rack reaches about a hundred units above
 * the point the data places it at.
 */
const PAD_X = 98;
const PAD_TOP = 126;
const PAD_BOTTOM = 92;

/** Shorten a wire at both ends so it stops short of each device. */
function trim(a: Point, b: Point, byA: number, byB: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  // Two devices closer together than their own footprints: draw the full
  // segment and let the glyphs cover it rather than produce a backwards line.
  if (d <= byA + byB + 2) return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, ux: 0, uy: 0 };
  const ux = dx / d;
  const uy = dy / d;
  return {
    x1: a.x + ux * byA,
    y1: a.y + uy * byA,
    x2: b.x - ux * byB,
    y2: b.y - uy * byB,
    ux,
    uy,
  };
}

/** A solid head at one end of a wire, pointing outward along it. */
function arrowAt(x: number, y: number, ux: number, uy: number) {
  const len = 9;
  const half = 4.6;
  // Back off along the wire, then step either side of it.
  const bx = x - ux * len;
  const by = y - uy * len;
  return `M${x} ${y} L${bx - uy * half} ${by + ux * half} L${bx + uy * half} ${by - ux * half} Z`;
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

  const reach = useMemo(
    () => new Map(protocol.nodes.map((n) => [n.id, glyphReach(n.kind)])),
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
    const at = hopAlong(points, progress, HOP);
    /** The wires this packet is using, so they can light up in its colour. */
    const wires = new Set(route.slice(1).map((id, i) => wireKey(route[i], id)));
    /** The device currently holding the packet, while it is being forwarded. */
    const forwarding = at.dwelling ? route[at.segment] : null;
    return {
      ...at,
      wires,
      forwarding,
      arriving: at.segment === points.length - 2 ? at.segmentRatio : 0,
      destination: points[points.length - 1],
      color: kindColor(packet.kind),
      packet,
    };
  }, [flight, adjacency, positions]);

  const label = motion?.packet.label ?? "";

  /**
   * The label rides beside the wire rather than on the packet. Devices stand
   * on the ends of a wire, so anything centred on the packet collides with a
   * machine or its name exactly when the packet arrives; a perpendicular
   * offset, always chosen on the upper side, keeps it in open air.
   */
  const labelAt = useMemo(() => {
    if (!motion) return { x: 0, y: -28 };
    let px = motion.heading.y;
    let py = -motion.heading.x;
    if (py > 0) {
      px = -px;
      py = -py;
    }
    return { x: px * 30, y: py * 30 - 8 };
  }, [motion]);
  /** The ring that opens on the destination as the last hop closes. */
  const landing = motion && motion.arriving > 0.72 ? (motion.arriving - 0.72) / 0.28 : 0;

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="map-svg"
      role="img"
      aria-label={`Network map for ${protocol.name}`}
    >
      <defs>
        <pattern id="bp-grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M34 0H0v34" fill="none" stroke="var(--grid)" strokeWidth="1" />
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
          const ra = (reach.get(link.from)?.wire ?? 42) + WIRE_GAP;
          const rb = (reach.get(link.to)?.wire ?? 42) + WIRE_GAP;
          const seg = trim(a, b, ra, rb);
          const live = motion?.wires.has(wireKey(link.from, link.to)) ?? false;
          const tint = live && motion ? { stroke: motion.color } : undefined;
          return (
            <g key={i}>
              <line className="link-bed" x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} />
              <line
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                className={`link-line${link.style === "dashed" ? " is-dashed" : ""}${
                  live ? " is-live" : ""
                }`}
                style={tint}
              />
              {/* Both ends carry a head: these wires run in either direction. */}
              <path
                className={`link-head${live ? " is-live" : ""}`}
                d={arrowAt(seg.x2, seg.y2, seg.ux, seg.uy)}
                style={live && motion ? { fill: motion.color } : undefined}
              />
              <path
                className={`link-head${live ? " is-live" : ""}`}
                d={arrowAt(seg.x1, seg.y1, -seg.ux, -seg.uy)}
                style={live && motion ? { fill: motion.color } : undefined}
              />
            </g>
          );
        })}
      </g>

      {/* The travelled portion of the current packet's route, on the floor. */}
      {motion && (
        <polyline
          className="packet-trail"
          points={motion.trail.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke={motion.color}
        />
      )}

      {/* The ring that opens on the device the packet is about to reach. */}
      {motion && landing > 0 && (
        <ellipse
          className="packet-landing"
          cx={motion.destination.x}
          cy={motion.destination.y}
          rx={12 + landing * 30}
          ry={(12 + landing * 30) * 0.5}
          stroke={motion.color}
          opacity={0.55 * (1 - landing)}
        />
      )}

      {/* --- devices ------------------------------------------------------ */}
      <g>
        {protocol.nodes.map((node) => {
          const isActive = active ? active.from === node.id || active.to === node.id : false;
          const busy = motion?.forwarding === node.id;
          const size = reach.get(node.id) ?? glyphReach(node.kind);
          return (
            <g
              key={node.id}
              className={`iso-node${isActive ? " is-active" : ""}${busy ? " is-busy" : ""}`}
              transform={`translate(${node.x} ${node.y})`}
            >
              {/* The device sits on its own shadow rather than on a disc. */}
              <ellipse
                className="iso-shadow"
                cx={size.wire * 0.12}
                cy={size.wire * 0.1}
                rx={size.wire * 0.86}
                ry={size.wire * 0.44}
              />
              {(isActive || busy) && (
                <ellipse className="iso-pulse" rx={size.wire * 0.9} ry={size.wire * 0.46} />
              )}

              <IsoGlyph kind={node.kind} />

              <text className="node-label" textAnchor="middle" y={size.label + 26}>
                {node.label}
              </text>
              {node.sublabel && (
                <text className="node-sub" textAnchor="middle" y={size.label + 42}>
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* --- the packet in flight ----------------------------------------- */}
      {motion && (
        <g>
          {/* The shadow stays on the floor and tightens as the packet climbs,
              which is what sells the height of the arc. */}
          <ellipse
            className="packet-shadow"
            cx={motion.x}
            cy={motion.y}
            rx={9 - (motion.lift / HOP) * 3.4}
            ry={(9 - (motion.lift / HOP) * 3.4) * 0.5}
            opacity={0.26 - (motion.lift / HOP) * 0.13}
          />

          <g transform={`translate(${motion.x} ${motion.y - motion.lift})`}>
            <circle className="packet-halo" r="16" fill={motion.color} />
            <circle r="7.5" fill={motion.color} />
            <circle className="packet-gloss" cx="-2.4" cy="-2.8" r="2.4" />
            <g transform={`translate(${labelAt.x} ${labelAt.y})`}>
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
        </g>
      )}
    </svg>
  );
}
