import type { ReactNode } from "react";
import type { NodeKind } from "@/data/types";
import { box, face, iso, line, type Vec3 } from "@/lib/iso";

/**
 * Isometric device art for the network map.
 *
 * Every glyph is modelled standing on the floor at the glyph origin, so the
 * map can place one with a single translate and put the device's label
 * directly underneath. Shapes are built from boxes rather than hand-traced
 * paths: the projection does the perspective, which keeps twelve devices
 * looking like they came off the same drawing board.
 */

function fixed(n: number) {
  return (Math.round(n * 100) / 100).toString();
}

/** Places a sub-shape at a point in room space. The projection is linear, so
 *  translating by the projected offset is the same as modelling it there. */
function At({ at, children }: { at: Vec3; children: ReactNode }) {
  const p = iso(at[0], at[1], at[2]);
  return <g transform={`translate(${fixed(p.x)} ${fixed(p.y)})`}>{children}</g>;
}

/** A solid box. The three faces carry different tints, which is what reads as
 *  depth once the outlines are all the same colour. */
function Box({ w, d, h, z = 0 }: { w: number; d: number; h: number; z?: number }) {
  const f = box(w, d, h, z);
  return (
    <>
      <polygon className="iso-face iso-left" points={f.left} />
      <polygon className="iso-face iso-right" points={f.right} />
      <polygon className="iso-face iso-top" points={f.top} />
    </>
  );
}

/** A detail line drawn flat on the right-hand face of a box of width `w`. */
function RightRule({ w, y1, y2, z }: { w: number; y1: number; y2: number; z: number }) {
  return <path className="iso-detail" d={line([w / 2, y1, z], [w / 2, y2, z])} />;
}

/** A small panel on the right-hand face — a vent, a port or a lamp. */
function RightPanel({
  w,
  y1,
  y2,
  z1,
  z2,
  lit,
}: {
  w: number;
  y1: number;
  y2: number;
  z1: number;
  z2: number;
  lit?: boolean;
}) {
  const x = w / 2;
  return (
    <polygon
      className={lit ? "iso-lamp" : "iso-panel"}
      points={face([x, y1, z1], [x, y2, z1], [x, y2, z2], [x, y1, z2])}
    />
  );
}

/** One rack unit: a shallow box with a vent and a lamp on its face. */
function RackUnit({ z }: { z: number }) {
  return (
    <>
      <Box w={46} d={46} h={22} z={z} />
      <RightPanel w={46} y1={-16} y2={-11} z1={z + 7} z2={z + 15} lit />
      <RightRule w={46} y1={-5} y2={17} z={z + 8} />
      <RightRule w={46} y1={-5} y2={17} z={z + 13} />
    </>
  );
}

export function IsoGlyph({ kind }: { kind: NodeKind }) {
  switch (kind) {
    /* --- a stack of rack units, the busiest glyph on the map ------------- */
    case "rack":
      return (
        <g>
          <RackUnit z={0} />
          <RackUnit z={28} />
          <RackUnit z={56} />
        </g>
      );

    /* --- one tall machine ------------------------------------------------ */
    case "server":
      return (
        <g>
          <Box w={46} d={46} h={84} />
          <RightPanel w={46} y1={-16} y2={-10} z1={66} z2={76} lit />
          <RightRule w={46} y1={-4} y2={17} z={70} />
          <RightRule w={46} y1={-4} y2={17} z={74} />
          <RightPanel w={46} y1={-16} y2={17} z1={38} z2={56} />
          <RightPanel w={46} y1={-16} y2={17} z1={12} z2={30} />
          <path className="iso-detail" d={line([-16, 23, 16], [16, 23, 16])} />
          <path className="iso-detail" d={line([-16, 23, 46], [16, 23, 46])} />
          <path className="iso-detail" d={line([-16, 23, 68], [16, 23, 68])} />
        </g>
      );

    /* --- router: a flat box with an antenna ------------------------------ */
    case "router":
      return (
        <g>
          <Box w={74} d={56} h={16} />
          {/* The antenna is the silhouette that tells a router from a switch. */}
          <path className="iso-mast" d={line([-24, -16, 16], [-24, -16, 48])} />
          <At at={[-24, -16, 50]}>
            <circle className="iso-tip" r="3.4" />
          </At>
          <RightPanel w={74} y1={-18} y2={-10} z1={4} z2={11} />
          <RightPanel w={74} y1={-6} y2={2} z1={4} z2={11} />
          <RightPanel w={74} y1={6} y2={14} z1={4} z2={11} />
          <polygon className="iso-lamp" points={face([14, -20, 16], [20, -20, 16], [20, -14, 16], [14, -14, 16])} />
          <polygon className="iso-panel" points={face([14, -8, 16], [20, -8, 16], [20, -2, 16], [14, -2, 16])} />
        </g>
      );

    /* --- switch: the same slab, ports instead of an antenna -------------- */
    case "switch":
      return (
        <g>
          <Box w={80} d={50} h={14} />
          {[-20, -10, 0, 10, 20].map((y) => (
            <RightPanel key={y} w={80} y1={y - 3.5} y2={y + 3.5} z1={3} z2={10} />
          ))}
          <path className="iso-detail" d={line([-26, 25, 7], [26, 25, 7])} />
        </g>
      );

    /* --- laptop: a slab with a lid leaning back -------------------------- */
    case "laptop":
    case "client":
      return (
        <g>
          <Box w={66} d={46} h={4} />
          {/* Keyboard well and trackpad, flat on the lid of the base. */}
          <polygon className="iso-panel" points={face([-26, -8, 4], [26, -8, 4], [26, 10, 4], [-26, 10, 4])} />
          <polygon className="iso-panel" points={face([-8, 14, 4], [8, 14, 4], [8, 20, 4], [-8, 20, 4])} />
          {/* The lid: bottom edge on the back of the base, top edge pushed
              further back, which is what makes it read as open. */}
          <polygon
            className="iso-face iso-lid"
            points={face([-29, -23, 4], [29, -23, 4], [29, -35, 46], [-29, -35, 46])}
          />
          <polygon
            className="iso-screen"
            points={face([-24, -24, 8], [24, -24, 8], [24, -34, 42], [-24, -34, 42])}
          />
          <path className="iso-detail" d={line([-18, -27, 18], [10, -27, 18])} />
          <path className="iso-detail" d={line([-18, -29, 25], [16, -29, 25])} />
          <path className="iso-detail" d={line([-18, -31, 32], [4, -31, 32])} />
        </g>
      );

    /* --- phone ----------------------------------------------------------- */
    case "phone":
      return (
        <g>
          <Box w={24} d={13} h={46} />
          <polygon
            className="iso-screen"
            points={face([12, -4, 8], [12, 4.5, 8], [12, 4.5, 40], [12, -4, 40])}
          />
          <path className="iso-detail" d={line([12, -1, 5], [12, 2, 5])} />
        </g>
      );

    /* --- cloud: the one glyph the camera does not apply to ---------------- */
    case "cloud":
      return (
        <g>
          <path
            className="iso-cloud"
            d="M-40 12 C-60 12 -60 -14 -41 -17 C-44 -40 -12 -47 -2 -30 C7 -45 36 -40 33 -19 C52 -16 52 12 33 12 Z"
          />
          <circle className="iso-globe" cx="-2" cy="-5" r="15" />
          <ellipse className="iso-detail" cx="-2" cy="-5" rx="6.4" ry="15" fill="none" />
          <path className="iso-detail" d="M-16.4 -10 H12.4 M-16.4 0 H12.4" />
        </g>
      );

    /* --- camera: body with a lens barrel on the front --------------------- */
    case "camera":
      return (
        <g>
          <Box w={30} d={22} h={8} />
          <Box w={34} d={26} h={22} z={8} />
          <At at={[17, 0, 19]}>
            <circle className="iso-lens" r="7" />
            <circle className="iso-tip" r="2.6" />
          </At>
          <polygon className="iso-lamp" points={face([17, -10, 24], [17, -6, 24], [17, -6, 28], [17, -10, 28])} />
        </g>
      );

    /* --- display --------------------------------------------------------- */
    case "tv":
      return (
        <g>
          <Box w={28} d={20} h={5} />
          <Box w={10} d={8} h={12} z={5} />
          <Box w={72} d={9} h={44} z={17} />
          <polygon
            className="iso-screen"
            points={face([36, -3, 22], [36, 3.5, 22], [36, 3.5, 56], [36, -3, 56])}
          />
          <path className="iso-detail" d={line([-30, 4.5, 20], [30, 4.5, 20])} />
        </g>
      );

    /* --- shield: a firewall or gateway ------------------------------------ */
    case "shield":
      return (
        <g>
          <Box w={34} d={26} h={5} />
          <At at={[0, 0, 7]}>
            <path
              className="iso-shield"
              d="M0 -46 L24 -35 L24 -14 C24 2 12 12 0 17 C-12 12 -24 2 -24 -14 L-24 -35 Z"
            />
            <path className="iso-check" d="M-10 -16 L-3 -8 L11 -26" />
          </At>
        </g>
      );

    /* --- printer ---------------------------------------------------------- */
    case "printer":
      return (
        <g>
          <Box w={58} d={44} h={26} />
          {/* A sheet resting in the output tray. */}
          <polygon className="iso-paper" points={face([-18, -14, 28], [18, -14, 28], [18, 2, 28], [-18, 2, 28])} />
          <RightPanel w={58} y1={-14} y2={14} z1={8} z2={13} />
          <polygon className="iso-lamp" points={face([29, -18, 17], [29, -14, 17], [29, -14, 21], [29, -18, 21])} />
        </g>
      );

    /* --- anything new in the data still gets a solid --------------------- */
    default:
      return (
        <g>
          <Box w={48} d={48} h={34} />
        </g>
      );
  }
}

/**
 * Roughly how far each glyph reaches from its origin, so the map can stop a
 * wire short of a device and drop its label clear of the base.
 */
export function glyphReach(kind: NodeKind) {
  switch (kind) {
    case "rack":
    case "server":
      return { wire: 46, label: 32 };
    case "router":
    case "switch":
      return { wire: 52, label: 24 };
    case "laptop":
    case "client":
      return { wire: 50, label: 26 };
    case "cloud":
      return { wire: 54, label: 20 };
    case "tv":
      return { wire: 46, label: 20 };
    case "phone":
      return { wire: 30, label: 14 };
    default:
      return { wire: 42, label: 24 };
  }
}
