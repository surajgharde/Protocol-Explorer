"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** How long the camera takes to travel between two framings. */
const CAMERA_MS = 620;
/**
 * Floor on a framing, and the shape every framing is pushed toward. A single
 * device would otherwise fill the panel at an absurd magnification, and a
 * two-device framing laid out flat would read at a different lens than a
 * five-device one.
 */
const MIN_W = 470;
const MIN_H = 330;
const ASPECT = 1.55;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The framing that holds a set of devices, at the camera's one lens. */
function frameOf(points: Point[]): Box {
  const minX = Math.min(...points.map((p) => p.x)) - PAD_X;
  const maxX = Math.max(...points.map((p) => p.x)) + PAD_X;
  const minY = Math.min(...points.map((p) => p.y)) - PAD_TOP;
  const maxY = Math.max(...points.map((p) => p.y)) + PAD_BOTTOM;

  let w = Math.max(MIN_W, maxX - minX);
  let h = Math.max(MIN_H, maxY - minY);
  if (w / h < ASPECT) w = h * ASPECT;
  else h = w / ASPECT;

  return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2, w, h };
}

/**
 * Eases the camera from wherever it is toward a new framing. A change of
 * protocol is a change of scene, so that one cuts instead of panning.
 */
function useEasedBox(target: Box, scene: string): Box {
  const [box, setBox] = useState(target);
  const boxRef = useRef(target);
  const sceneRef = useRef(scene);
  const key = `${target.x} ${target.y} ${target.w} ${target.h}`;

  useEffect(() => {
    if (sceneRef.current !== scene) {
      sceneRef.current = scene;
      boxRef.current = target;
      setBox(target);
      return;
    }

    const from = boxRef.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / CAMERA_MS);
      const e = t * t * (3 - 2 * t);
      const next = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      };
      boxRef.current = next;
      setBox(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // `key` stands in for `target`, which is a fresh object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scene]);

  return box;
}

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
  stepIndex,
  overview,
}: {
  protocol: Protocol;
  flight: { packet: Packet; progress: number } | null;
  lastPacket: Packet | null;
  /** The step the lesson is on, which is what the camera frames. */
  stepIndex: number;
  /** Before the capture has moved: show the whole topology rather than a step. */
  overview: boolean;
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

  /** The whole floor plan, which the grid and the wash are painted across. */
  const world = useMemo(() => {
    const all = frameOf(protocol.nodes.map((n) => ({ x: n.x, y: n.y })));
    // Generous bleed: the camera pans inside this, and the grid must not end
    // part way through a move.
    return { x: all.x - 400, y: all.y - 400, w: all.w + 800, h: all.h + 800 };
  }, [protocol]);

  /** Every device each step puts on the wire, intermediate hops included. */
  const stepCast = useMemo(() => {
    const byStep = new Map<number, Set<string>>();
    for (const packet of protocol.packets) {
      const cast = byStep.get(packet.step) ?? new Set<string>();
      for (const id of routeBetween(packet.from, packet.to, adjacency)) cast.add(id);
      byStep.set(packet.step, cast);
    }
    return byStep;
  }, [protocol, adjacency]);

  /**
   * Who the camera is on. A step that sends nothing — the browser preparing a
   * request, the page painting — still has a subject: wherever the last packet
   * landed, or wherever the next one is about to leave from.
   */
  const cast = useMemo(() => {
    if (overview) return new Set(protocol.nodes.map((n) => n.id));
    const direct = stepCast.get(stepIndex);
    if (direct?.size) return direct;
    const before = protocol.packets.filter((p) => p.step < stepIndex).at(-1);
    if (before) return new Set([before.to]);
    const after = protocol.packets.find((p) => p.step > stepIndex);
    if (after) return new Set([after.from]);
    return new Set(protocol.nodes.map((n) => n.id));
  }, [overview, stepCast, stepIndex, protocol]);

  /**
   * Scenery: a device no packet ever routes through, such as the internet
   * cloud hanging off a router. It carries no traffic of its own, so it would
   * never arrive on its own account — it comes in with whatever it links to,
   * and is framed with it so its name is not left hanging off the edge.
   */
  const dressed = useCallback(
    (base: Set<string>) => {
      const carries = new Set<string>();
      for (const ids of stepCast.values()) for (const id of ids) carries.add(id);
      const set = new Set(base);
      for (const node of protocol.nodes) {
        if (carries.has(node.id) || set.has(node.id)) continue;
        if ((adjacency.get(node.id) ?? []).some((peer) => base.has(peer))) set.add(node.id);
      }
      return set;
    },
    [stepCast, protocol, adjacency],
  );

  /** Devices the lesson has reached. A device never leaves once it arrives. */
  const shown = useMemo(() => {
    if (overview) return new Set(protocol.nodes.map((n) => n.id));
    const reached = new Set(cast);
    for (const [step, ids] of stepCast) {
      if (step <= stepIndex) for (const id of ids) reached.add(id);
    }
    return dressed(reached);
  }, [overview, cast, stepCast, stepIndex, protocol, dressed]);

  const target = useMemo(() => {
    const framed = overview ? cast : dressed(cast);
    const points = protocol.nodes
      .filter((n) => framed.has(n.id))
      .map((n) => ({ x: n.x, y: n.y }));
    return frameOf(points.length ? points : protocol.nodes.map((n) => ({ x: n.x, y: n.y })));
  }, [overview, cast, dressed, protocol]);

  const box = useEasedBox(target, protocol.id);

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

      <rect x={world.x} y={world.y} width={world.w} height={world.h} fill="url(#bp-grid)" />
      <rect x={world.x} y={world.y} width={world.w} height={world.h} fill="url(#bp-wash)" />

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
          // A wire only exists once both devices it joins have arrived.
          const here = shown.has(link.from) && shown.has(link.to);
          return (
            <g key={i} className={`wire${here ? "" : " is-away"}`}>
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
              className={`iso-node${isActive ? " is-active" : ""}${busy ? " is-busy" : ""}${
                shown.has(node.id) ? "" : " is-away"
              }`}
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
