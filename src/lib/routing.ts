import type { Protocol } from "@/data/types";

export type Point = { x: number; y: number };

/** Undirected neighbour map of the drawn links, skipping any dangling ends. */
export function buildAdjacency(
  links: Protocol["links"],
  exists: (id: string) => boolean,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const link of links) {
    if (!exists(link.from) || !exists(link.to)) continue;
    map.set(link.from, [...(map.get(link.from) ?? []), link.to]);
    map.set(link.to, [...(map.get(link.to) ?? []), link.from]);
  }
  return map;
}

/**
 * Shortest path through the drawn links, so a packet follows the wires rather
 * than cutting across the map. Falls back to a straight line when the two
 * devices are not connected in the diagram.
 */
export function routeBetween(
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

export interface AlongResult extends Point {
  /** Unit heading of the wire being crossed. */
  heading: Point;
  /** Height above the floor, which is what turns a slide into a hop. */
  lift: number;
  /** The route walked so far, along the floor. */
  trail: Point[];
  /** Which wire of the route the packet is on. */
  segment: number;
  /** Progress across that one wire, 0..1, already eased. */
  segmentRatio: number;
  /** True while the packet is held at a device rather than travelling. */
  dwelling: boolean;
}

/** Share of a wire's time spent being forwarded by the device it leaves. */
const FORWARD_DWELL = 0.12;

/**
 * Smoothstep rather than a cubic ease. The dwell already holds the packet
 * still at the device; following it with a steep ease-in left the packet
 * barely moving for the first sixth of the wire, which read as a stall rather
 * than as acceleration.
 */
function ease(t: number) {
  return t * t * (3 - 2 * t);
}

/**
 * Position along a route, one wire at a time.
 *
 * Each wire gets an equal share of the flight rather than a share of the
 * distance, so a short hop between two devices standing close together still
 * reads as a hop. Within a wire the packet eases away and eases in, and on
 * every wire after the first it is held briefly at the device doing the
 * forwarding — a packet should visibly stop to be routed rather than glide
 * over a router as though it were not there. `hop` is the peak height of the
 * arc, which the map pairs with a shadow on the floor.
 */
export function hopAlong(points: Point[], progress: number, hop: number): AlongResult {
  const segments = points.length - 1;
  if (segments < 1) {
    return {
      ...points[0],
      heading: { x: 1, y: 0 },
      lift: 0,
      trail: [points[0]],
      segment: 0,
      segmentRatio: 0,
      dwelling: false,
    };
  }

  const scaled = Math.min(Math.max(progress, 0), 1) * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  const local = scaled - index;

  // The first wire has nothing to wait for: the packet starts at its source.
  const dwell = index === 0 ? 0 : FORWARD_DWELL;
  const dwelling = local < dwell;
  const t = dwelling ? 0 : ease((local - dwell) / (1 - dwell));

  const a = points[index];
  const b = points[index + 1];
  const here = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };

  // Unit heading of the wire being crossed, so the map can hang the packet's
  // label alongside the wire instead of on top of whatever it is passing.
  const span = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const heading = { x: (b.x - a.x) / span, y: (b.y - a.y) / span };

  return {
    ...here,
    heading,
    lift: Math.sin(Math.PI * t) * hop,
    trail: [...points.slice(0, index + 1), here],
    segment: index,
    segmentRatio: t,
    dwelling,
  };
}

/** Key for a link, order-independent, so a route can light up the wires it uses. */
export function wireKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
