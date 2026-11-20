"use client";

import { useMemo } from "react";
import type { Packet, Protocol } from "@/data/types";
import { kindColor } from "@/lib/packetKinds";

/** Drawn in the same 1000-wide viewBox as the other two diagrams. */
const VIEW_W = 1000;
/** Room above the bands for each endpoint's name and role. */
const HEAD_H = 56;
/** Height of one layer band. */
const ROW_H = 76;
/** Gap between the head and the first band. */
const TOP_GAP = 12;
/** Half the width of one stack. */
const COL_HALF = 152;
/** Column centres when both endpoints are drawn. */
const LEFT_CX = 212;
const RIGHT_CX = 788;
/** How far below the last band the medium runs. */
const WIRE_DROP = 46;
/** Space kept under the medium for its label. */
const BOTTOM_PAD = 36;

/**
 * Share of one packet's flight spent wrapping, crossing and unwrapping. The
 * two stacks take 40% each and the wire 20%, which keeps the headers readable
 * without making the hop across feel instant.
 */
const DESCENT_END = 0.4;
const CROSS_END = 0.6;
/** Within a band: wrap the new header first, then travel to the next band. */
const WRAP_SHARE = 0.55;

const CHIP_H = 26;
const CHIP_GAP = 3;
/** Longest payload label drawn before it is cut short. */
const PAYLOAD_MAX = 16;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Chips are sized from their text, the way the map sizes its packet label. */
function chipW(text: string) {
  return text.length * 6.6 + 16;
}

interface Band {
  layer: number;
  name: string;
  /** Header this layer prepends on the way down, e.g. "IP". */
  header: string;
}

/** "Application (Layer 7)" reads as just "Application" over a band. */
function shortLayerName(layerName: string) {
  return layerName.split(" (")[0];
}

/**
 * The protocol's own notes say what carries it in prose rather than as a
 * header name, so the transport header is read back out of them.
 */
function transportHeader(protocol: Protocol) {
  const notes = `${protocol.transport} ${protocol.port}`.toUpperCase();
  if (notes.includes("QUIC")) return "QUIC";
  if (notes.includes("UDP")) return "UDP";
  return "TCP";
}

/**
 * The bands this protocol's data actually passes through: its own layer, then
 * every layer below it that adds a header of its own. A protocol that already
 * sits at the link layer gets a single band, because nothing wraps it further.
 */
function buildBands(protocol: Protocol): Band[] {
  const below: Band[] = [
    { layer: 4, name: "Transport", header: transportHeader(protocol) },
    { layer: 3, name: "Network", header: "IP" },
    { layer: 2, name: "Link", header: "Ethernet" },
  ].filter((band) => band.layer < protocol.layer);

  return [
    {
      layer: protocol.layer,
      name: shortLayerName(protocol.layerName),
      header: protocol.name,
    },
    ...below,
  ];
}

interface Chip {
  text: string;
  /** The payload chip is outlined rather than filled, so it reads as data. */
  payload: boolean;
  x: number;
  w: number;
}

/**
 * Lays the protocol data unit out from its right edge, so added headers grow
 * leftwards and the payload stays put — the shape encapsulation actually has.
 */
function layoutPdu(bands: Band[], depth: number, payload: string, grow: number): Chip[] {
  const chips: Chip[] = [];
  let x = 0;

  const place = (text: string, isPayload: boolean, scale: number) => {
    const w = chipW(text) * scale;
    x -= w;
    chips.push({ text, payload: isPayload, x, w });
    x -= CHIP_GAP;
  };

  place(payload, true, 1);
  // The band the unit is sitting in is the one mid-wrap; everything above it
  // was wrapped on the way down and is drawn at full width.
  for (let i = 0; i <= depth; i++) {
    place(bands[i].header, false, i === depth ? grow : 1);
  }

  return chips.reverse();
}

export function StackDiagram({
  protocol,
  flight,
  lastPacket,
}: {
  protocol: Protocol;
  flight: { packet: Packet; progress: number } | null;
  lastPacket: Packet | null;
}) {
  const bands = useMemo(() => buildBands(protocol), [protocol]);
  const nodeById = useMemo(
    () => new Map(protocol.nodes.map((node) => [node.id, node])),
    [protocol],
  );

  const bandTop = (i: number) => HEAD_H + TOP_GAP + i * ROW_H;
  const bandY = (i: number) => bandTop(i) + ROW_H / 2;
  const wireY = bandTop(bands.length) + WIRE_DROP;
  const bodyH = wireY + BOTTOM_PAD;

  /** A paused capture still shows the packet that last landed, fully delivered. */
  const packet = flight?.packet ?? lastPacket;
  const progress = flight ? flight.progress : 1;

  const stage = useMemo(() => {
    if (!packet) return null;

    const order = new Map(protocol.nodes.map((node, i) => [node.id, i]));
    const fromRank = order.get(packet.from) ?? 0;
    const toRank = order.get(packet.to) ?? 1;
    const selfCall = packet.from === packet.to;

    // Columns keep the map's own left-to-right order, so a reply runs back the
    // way it came instead of swapping the two stacks around.
    const leftId = selfCall || fromRank <= toRank ? packet.from : packet.to;
    const rightId = selfCall ? packet.from : leftId === packet.from ? packet.to : packet.from;
    const sendingRight = leftId === packet.from;

    const leftCx = selfCall ? VIEW_W / 2 : LEFT_CX;
    const rightCx = selfCall ? VIEW_W / 2 : RIGHT_CX;
    const senderCx = sendingRight ? leftCx : rightCx;
    const receiverCx = sendingRight ? rightCx : leftCx;

    const n = bands.length;
    const last = n - 1;
    let depth: number;
    let grow: number;
    let y: number;
    let cx: number;
    let crossing = false;

    if (progress < DESCENT_END) {
      // --- wrapping, down the sender's stack ---
      const d = (progress / DESCENT_END) * n;
      depth = Math.min(last, Math.floor(d));
      const frac = d - depth;
      grow = clamp01(frac / WRAP_SHARE);
      const travel = clamp01((frac - WRAP_SHARE) / (1 - WRAP_SHARE));
      y = lerp(bandY(depth), depth < last ? bandY(depth + 1) : wireY, travel);
      cx = senderCx;
    } else if (progress < CROSS_END) {
      // --- crossing the medium, fully wrapped ---
      const u = (progress - DESCENT_END) / (CROSS_END - DESCENT_END);
      depth = last;
      grow = 1;
      y = wireY;
      cx = lerp(senderCx, receiverCx, u);
      crossing = true;
    } else {
      // --- unwrapping, up the receiver's stack ---
      const a = ((progress - CROSS_END) / (1 - CROSS_END)) * n;
      const risen = Math.min(last, Math.floor(a));
      const frac = a - risen;
      depth = last - risen;
      const travel = clamp01(frac / (1 - WRAP_SHARE));
      y = lerp(risen === 0 ? wireY : bandY(depth + 1), bandY(depth), travel);
      grow = 1 - clamp01((frac - (1 - WRAP_SHARE)) / WRAP_SHARE);
      cx = receiverCx;
    }

    const payload =
      packet.label.length > PAYLOAD_MAX
        ? `${packet.label.slice(0, PAYLOAD_MAX - 1)}…`
        : packet.label;

    return {
      columns: selfCall
        ? [{ id: leftId, cx: leftCx, role: "sends and receives" }]
        : [
            { id: leftId, cx: leftCx, role: sendingRight ? "encapsulates ↓" : "decapsulates ↑" },
            { id: rightId, cx: rightCx, role: sendingRight ? "decapsulates ↑" : "encapsulates ↓" },
          ],
      chips: layoutPdu(bands, depth, payload, grow),
      color: kindColor(packet.kind),
      depth,
      y,
      cx,
      crossing,
    };
  }, [packet, progress, protocol, bands, wireY]);

  const columns =
    stage?.columns ??
    protocol.nodes.slice(0, 2).map((node, i) => ({
      id: node.id,
      cx: i === 0 ? LEFT_CX : RIGHT_CX,
      role: i === 0 ? "encapsulates ↓" : "decapsulates ↑",
    }));

  return (
    <div className="diagram-body" style={{ overflowY: "auto" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${bodyH}`}
        preserveAspectRatio="xMidYMin meet"
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`Encapsulation stack for ${protocol.name}`}
      >
        {/* --- endpoint heads ----------------------------------------------- */}
        {columns.map((col) => {
          const node = nodeById.get(col.id);
          return (
            <g key={col.id}>
              <text className="seq-head" x={col.cx} y={24} textAnchor="middle">
                {node?.label ?? col.id}
              </text>
              <text className="stk-role" x={col.cx} y={41} textAnchor="middle">
                {col.role}
              </text>
            </g>
          );
        })}

        {/* --- layer bands -------------------------------------------------- */}
        {bands.map((band, i) => (
          <g key={band.layer}>
            <text className="stk-layer" x={VIEW_W / 2} y={bandY(i) - 2} textAnchor="middle">
              {band.name.toUpperCase()}
            </text>
            <text className="stk-badge" x={VIEW_W / 2} y={bandY(i) + 14} textAnchor="middle">
              {`LAYER ${band.layer} · ${band.header}`}
            </text>

            {columns.map((col) => {
              const live = stage
                ? stage.depth === i && !stage.crossing && stage.cx === col.cx
                : false;
              return (
                <rect
                  key={col.id}
                  className={`stk-band${live ? " is-live" : ""}`}
                  x={col.cx - COL_HALF}
                  y={bandTop(i) + 4}
                  width={COL_HALF * 2}
                  height={ROW_H - 8}
                  rx="6"
                  style={live && stage ? { stroke: stage.color } : undefined}
                />
              );
            })}
          </g>
        ))}

        {/* --- the medium, under both stacks -------------------------------- */}
        {columns.map((col) => (
          <line
            key={`drop-${col.id}`}
            className="stk-drop"
            x1={col.cx}
            y1={bandTop(bands.length)}
            x2={col.cx}
            y2={wireY}
          />
        ))}
        <line
          className="link-bed"
          x1={columns[0].cx}
          y1={wireY}
          x2={columns[columns.length - 1].cx}
          y2={wireY}
        />
        <line
          className={`link-line${stage?.crossing ? " is-live" : ""}`}
          x1={columns[0].cx}
          y1={wireY}
          x2={columns[columns.length - 1].cx}
          y2={wireY}
          style={stage?.crossing ? { stroke: stage.color } : undefined}
        />
        <text className="stk-badge" x={VIEW_W / 2} y={wireY + 22} textAnchor="middle">
          LAYER 1 &middot; PHYSICAL MEDIUM
        </text>

        {/* --- the protocol data unit --------------------------------------- */}
        {stage && (
          <g transform={`translate(${stage.cx} ${stage.y})`}>
            {stage.chips.map((chip, i) =>
              chip.w < 1 ? null : (
                <g key={`${chip.text}-${i}`}>
                  <rect
                    x={chip.x}
                    y={-CHIP_H / 2}
                    width={chip.w}
                    height={CHIP_H}
                    rx="3"
                    fill={chip.payload ? "var(--panel)" : stage.color}
                    stroke={stage.color}
                    strokeWidth={chip.payload ? 1.6 : 0}
                  />
                  {/* Text is held back while a header is still growing in, so a
                      half-wrapped chip never shows a clipped word. */}
                  {chip.w > chipW(chip.text) - 2 && (
                    <text
                      className="stk-chip"
                      x={chip.x + chip.w / 2}
                      y={4}
                      textAnchor="middle"
                      fill={chip.payload ? stage.color : "#fff"}
                    >
                      {chip.text}
                    </text>
                  )}
                </g>
              ),
            )}
          </g>
        )}

        {!stage && (
          <text className="stk-hint" x={VIEW_W / 2} y={bodyH - 8} textAnchor="middle">
            Play the capture to watch a packet wrap and unwrap
          </text>
        )}
      </svg>
    </div>
  );
}
