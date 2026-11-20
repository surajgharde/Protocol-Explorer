/**
 * A 2:1 isometric camera for the network map's device art.
 *
 * Devices are modelled in a right-handed room: +x runs back-right, +y runs
 * back-left and +z is up. The map's own floor plan is untouched — only the
 * glyph drawn at each node is built in this space, so a device reads as a
 * solid object while the topology stays the flat plan the data describes.
 */

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

export type Vec3 = [x: number, y: number, z: number];

/** Two decimals is under half a pixel at this scale and keeps the DOM small. */
function round(n: number) {
  return Math.round(n * 100) / 100;
}

/** Project a point in room space onto the screen. */
export function iso(x: number, y: number, z: number) {
  return { x: (x - y) * COS30, y: (x + y) * SIN30 - z };
}

/** One projected corner, ready for a `points` attribute. */
export function corner(x: number, y: number, z: number) {
  const p = iso(x, y, z);
  return `${round(p.x)},${round(p.y)}`;
}

/** A projected polygon, for `points`. */
export function face(...corners: Vec3[]) {
  return corners.map((c) => corner(c[0], c[1], c[2])).join(" ");
}

/** A projected open path, for `d`. */
export function line(...corners: Vec3[]) {
  return corners.map((c, i) => `${i === 0 ? "M" : "L"}${corner(c[0], c[1], c[2])}`).join("");
}

export interface BoxFaces {
  /** Lid, the brightest of the three. */
  top: string;
  /** The face toward the lower right. */
  right: string;
  /** The face toward the lower left, the one kept darkest. */
  left: string;
}

/**
 * The three faces of a box standing on the floor, centred on the glyph origin.
 * Only three of the six are ever visible from this camera, so the hidden ones
 * are never emitted.
 */
export function box(w: number, d: number, h: number, z0 = 0): BoxFaces {
  const hw = w / 2;
  const hd = d / 2;
  const z1 = z0 + h;
  return {
    top: face([-hw, -hd, z1], [hw, -hd, z1], [hw, hd, z1], [-hw, hd, z1]),
    right: face([hw, -hd, z1], [hw, hd, z1], [hw, hd, z0], [hw, -hd, z0]),
    left: face([-hw, hd, z1], [hw, hd, z1], [hw, hd, z0], [-hw, hd, z0]),
  };
}

/**
 * How far the base of a box reaches from the glyph origin, used to keep wires
 * and labels clear of the device without measuring every glyph by hand.
 */
export function footprint(w: number, d: number) {
  return { x: ((w + d) / 2) * COS30, y: ((w + d) / 2) * SIN30 };
}
