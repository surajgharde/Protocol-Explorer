import type { PacketKind } from "@/data/types";

/**
 * Packet families share one colour across the legend, the network map, the
 * sequence arrows and the capture table, so a colour always means the same
 * thing wherever you see it. Values are CSS custom properties defined in
 * globals.css, which lets the palette shift between light and dark.
 */
export const packetKinds: Record<PacketKind, { label: string; color: string }> = {
  dns: { label: "DNS", color: "var(--pk-dns)" },
  transport: { label: "Transport", color: "var(--pk-transport)" },
  request: { label: "Request", color: "var(--pk-request)" },
  response: { label: "Response", color: "var(--pk-response)" },
  secure: { label: "Encrypted", color: "var(--pk-secure)" },
  control: { label: "Control", color: "var(--pk-control)" },
  media: { label: "Media", color: "var(--pk-media)" },
};

export const packetKindOrder: PacketKind[] = [
  "dns",
  "transport",
  "request",
  "response",
  "secure",
  "control",
  "media",
];

export function kindColor(kind: PacketKind) {
  return packetKinds[kind].color;
}

/** Formats a capture timestamp the way a packet analyser would. */
export function formatTime(t: number) {
  return `${t.toFixed(3)}s`;
}
