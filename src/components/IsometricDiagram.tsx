"use client";

import { useMemo } from "react";
import type { Packet, Protocol, TopologyNode } from "@/data/types";
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
 * The camera: a cabinet-oblique projection of the same floor plan the flat map
 * draws. Depth pushes a point to the right and the whole plane is squashed
 * vertically, which is what turns the diagram into a tilted table rather than a
 * sheet of paper. Nothing in the data changes — only how x/y reach the screen.
 */
const SKEW = 0.44;
/**
 * Vertical compression. Kept mild on purpose: the depth cues come mostly from
 * the shear, the raised plates and the shadows, and squashing harder would
 * collapse the gap between stacked devices — the three nameservers in the DNS
 * topology sit only 130 units apart on the floor plan.
 */
const SQUASH = 0.76;

/** How high a device floats over its plate, and how thick the plate is. */
const ELEVATION = 50;
const SLAB = 10;
const PLATE_RX = 38;
/** Devices are the subject, so they draw larger than on the flat map. */
const DEVICE_SCALE = 1.16;
/** Peak lift of a packet as it hops along one wire. */
const HOP = 36;
/** Far devices draw smaller — the perspective cue an oblique projection lacks. */
const FAR_SCALE = 0.88;

const PAD_X = 82;
const PAD_TOP = 104;
const PAD_BOTTOM = 98;
/** How far the floor runs past the outermost device. */
const FLOOR_BLEED = 130;
const GRID_STEP = 68;

function makeCamera(nodes: TopologyNode[]) {
  const ys = nodes.map((n) => n.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(1, maxY - minY);

  /** Floor-plan coordinates to screen coordinates. */
  const ground = (x: number, y: number) => ({
    x: x + (maxY - y) * SKEW,
    y: y * SQUASH,
  });

  /** 0 at the back of the plane, 1 at the front. */
  const nearness = (y: number) => (y - minY) / span;

  return {
    ground,
    nearness,
    scaleAt: (y: number) => FAR_SCALE + (1 - FAR_SCALE) * nearness(y),
  };
}

export function IsometricDiagram({
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

  const camera = useMemo(() => makeCamera(protocol.nodes), [protocol]);

  const adjacency = useMemo(
    () => buildAdjacency(protocol.links, (id) => positions.has(id)),
    [protocol, positions],
  );

  /** Devices are painted back to front so near ones overlap far ones. */
  const painted = useMemo(
    () => [...protocol.nodes].sort((a, b) => a.y - b.y),
    [protocol],
  );

  /** The floor: a filled parallelogram and the grid ruled across it. */
  const floor = useMemo(() => {
    const xs = protocol.nodes.map((n) => n.x);
    const ys = protocol.nodes.map((n) => n.y);
    const x0 = Math.min(...xs) - FLOOR_BLEED;
    const x1 = Math.max(...xs) + FLOOR_BLEED;
    const y0 = Math.min(...ys) - FLOOR_BLEED * 0.7;
    const y1 = Math.max(...ys) + FLOOR_BLEED * 0.7;

    const corners = [
      camera.ground(x0, y0),
      camera.ground(x1, y0),
      camera.ground(x1, y1),
      camera.ground(x0, y1),
    ];

    const lines: { a: Point; b: Point }[] = [];
    for (let x = Math.ceil(x0 / GRID_STEP) * GRID_STEP; x <= x1; x += GRID_STEP) {
      lines.push({ a: camera.ground(x, y0), b: camera.ground(x, y1) });
    }
    for (let y = Math.ceil(y0 / GRID_STEP) * GRID_STEP; y <= y1; y += GRID_STEP) {
      lines.push({ a: camera.ground(x0, y), b: camera.ground(x1, y) });
    }
    return { corners, lines };
  }, [protocol, camera]);

  /** Fit the viewBox to the projected devices, with room for plates and labels. */
  const box = useMemo(() => {
    const pts = protocol.nodes.map((n) => camera.ground(n.x, n.y));
    const minX = Math.min(...pts.map((p) => p.x)) - PAD_X;
    const maxX = Math.max(...pts.map((p) => p.x)) + PAD_X;
    const minY = Math.min(...pts.map((p) => p.y)) - PAD_TOP;
    const maxY = Math.max(...pts.map((p) => p.y)) + PAD_BOTTOM;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [protocol, camera]);

  const active = flight?.packet ?? lastPacket;

  const motion = useMemo(() => {
    if (!flight) return null;
    const { packet, progress } = flight;
    const route = routeBetween(packet.from, packet.to, adjacency);
    const plan = route.map((id) => positions.get(id)).filter(Boolean) as Point[];
    if (plan.length < 2) return null;

    /** Lift follows one arch per wire, so the packet hops rather than flies. */
    const liftAt = (ratio: number) => Math.sin(ratio * Math.PI) * HOP;

    const at = pointAlong(plan, progress);
    const here = camera.ground(at.x, at.y);
    const lift = liftAt(at.segmentRatio);

    // The contrail is resampled each frame so it arches with the hops.
    const STEPS = 44;
    const trail: Point[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const sample = pointAlong(plan, (progress * i) / STEPS);
      const g = camera.ground(sample.x, sample.y);
      trail.push({ x: g.x, y: g.y - liftAt(sample.segmentRatio) });
    }

    const wires = new Set(route.slice(1).map((id, i) => wireKey(route[i], id)));

    return { here, lift, trail, wires, color: kindColor(packet.kind), packet };
  }, [flight, adjacency, positions, camera]);

  const label = motion?.packet.label ?? "";
  /** The shadow tightens as the packet climbs, which is what sells the height. */
  const shadowR = motion ? 14 - (motion.lift / HOP) * 5.5 : 0;

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="iso-svg"
      role="img"
      aria-label={`Three-dimensional network map for ${protocol.name}`}
    >
      <defs>
        <linearGradient id="iso-floor-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--iso-floor-far)" />
          <stop offset="100%" stopColor="var(--iso-floor)" />
        </linearGradient>
      </defs>

      {/* --- the floor ---------------------------------------------------- */}
      <polygon
        className="iso-floor"
        fill="url(#iso-floor-fade)"
        points={floor.corners.map((p) => `${p.x},${p.y}`).join(" ")}
      />
      <g className="iso-grid">
        {floor.lines.map((line, i) => (
          <line key={i} x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />
        ))}
      </g>

      {/* --- the wires, lying on the floor -------------------------------- */}
      <g>
        {protocol.links.map((link, i) => {
          const a = positions.get(link.from);
          const b = positions.get(link.to);
          if (!a || !b) return null;
          const ga = camera.ground(a.x, a.y);
          const gb = camera.ground(b.x, b.y);
          const live = motion?.wires.has(wireKey(link.from, link.to)) ?? false;
          return (
            <g key={i}>
              <line className="iso-wire-bed" x1={ga.x} y1={ga.y} x2={gb.x} y2={gb.y} />
              <line
                x1={ga.x}
                y1={ga.y}
                x2={gb.x}
                y2={gb.y}
                className={`iso-wire${link.style === "dashed" ? " is-dashed" : ""}${
                  live ? " is-live" : ""
                }`}
                style={live && motion ? { stroke: motion.color } : undefined}
              />
            </g>
          );
        })}
      </g>

      {/* --- the contrail, under the devices so it reads as depth --------- */}
      {motion && motion.trail.length > 1 && (
        <polyline
          className="iso-trail"
          points={motion.trail.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke={motion.color}
        />
      )}

      {/* --- devices, back to front --------------------------------------- */}
      <g>
        {painted.map((node) => {
          const g = camera.ground(node.x, node.y);
          const s = camera.scaleAt(node.y);
          const isActive = active
            ? active.from === node.id || active.to === node.id
            : false;
          return (
            <g
              key={node.id}
              className={`node-group iso-node${isActive ? " is-active" : ""}`}
              transform={`translate(${g.x} ${g.y}) scale(${s.toFixed(3)})`}
            >
              {/* the plate: bottom cap, side wall, then the lit top face */}
              <ellipse
                className="iso-plate-side"
                cy={SLAB}
                rx={PLATE_RX}
                ry={PLATE_RX * SQUASH}
              />
              <rect
                className="iso-plate-wall"
                x={-PLATE_RX}
                y={0}
                width={PLATE_RX * 2}
                height={SLAB}
              />
              <ellipse className="iso-plate-top" rx={PLATE_RX} ry={PLATE_RX * SQUASH} />
              {isActive && (
                <ellipse className="iso-ripple" rx={PLATE_RX} ry={PLATE_RX * SQUASH} />
              )}

              {/* the device's own shadow, cast down onto its plate */}
              <ellipse className="iso-cast" rx="18" ry={18 * SQUASH} />
              <line className="iso-pole" y1={-2} y2={-ELEVATION + 22} />

              <g className="iso-device" transform={`translate(0 ${-ELEVATION})`}>
                <g transform={`scale(${DEVICE_SCALE})`}>
                  <NodeGlyph kind={node.kind} />
                </g>
              </g>
            </g>
          );
        })}
      </g>

      {/* --- names, above the devices so none can be buried --------------- */}
      <g>
        {painted.map((node) => {
          const g = camera.ground(node.x, node.y);
          const s = camera.scaleAt(node.y);
          const isActive = active
            ? active.from === node.id || active.to === node.id
            : false;
          return (
            <g
              key={node.id}
              className={`node-group iso-node${isActive ? " is-active" : ""}`}
              transform={`translate(${g.x} ${g.y}) scale(${s.toFixed(3)})`}
            >
              <text className="node-label" textAnchor="middle" y={SLAB + 44}>
                {node.label}
              </text>
              {node.sublabel && (
                <text className="node-sub" textAnchor="middle" y={SLAB + 60}>
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
          {/* The shadow sits on the floor directly below the orb — the
              strongest signal that the packet is actually off the ground. */}
          <ellipse
            className="iso-packet-shadow"
            cx={motion.here.x}
            cy={motion.here.y}
            rx={shadowR}
            ry={shadowR * SQUASH}
          />
          <line
            className="iso-packet-drop"
            x1={motion.here.x}
            y1={motion.here.y}
            x2={motion.here.x}
            y2={motion.here.y - motion.lift}
            stroke={motion.color}
          />
          <g transform={`translate(${motion.here.x} ${motion.here.y - motion.lift})`}>
            <circle className="iso-orb-halo" r="17" fill={motion.color} />
            <circle r="8.5" fill={motion.color} />
            <circle className="iso-orb-gloss" cx="-2.8" cy="-3.2" r="2.8" />
            <g transform="translate(0 -28)">
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
