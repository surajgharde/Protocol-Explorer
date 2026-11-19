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
  /** Heading in degrees at this point. */
  angle: number;
  /** The route up to and including this point. */
  trail: Point[];
  /** Which segment of the polyline the point sits on. */
  segment: number;
  /** Progress across that one segment, 0..1 — drives the per-wire hop arc. */
  segmentRatio: number;
}

/** Position and heading at `progress` along a polyline, measured by arc length. */
export function pointAlong(points: Point[], progress: number): AlongResult {
  const spans = points
    .slice(1)
    .map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = spans.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { ...points[0], angle: 0, trail: [points[0]], segment: 0, segmentRatio: 0 };
  }

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
        segment: i,
        segmentRatio: ratio,
      };
    }
    remaining -= spans[i];
  }

  const last = points.length - 1;
  return {
    ...points[last],
    angle: 0,
    trail: points,
    segment: Math.max(0, last - 1),
    segmentRatio: 1,
  };
}

/** Key for a link, order-independent, so a route can light up the wires it uses. */
export function wireKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
