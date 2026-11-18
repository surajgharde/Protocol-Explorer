/** Visual family for a node glyph on the network map. */
export type NodeKind =
  | "client"
  | "laptop"
  | "phone"
  | "router"
  | "switch"
  | "server"
  | "rack"
  | "cloud"
  | "camera"
  | "tv"
  | "shield"
  | "printer";

/** A device drawn on the network map. Coordinates live in a 1000x520 viewBox. */
export interface TopologyNode {
  id: string;
  label: string;
  /** Address or role shown under the label. */
  sublabel?: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Hidden from the sequence diagram's lifelines (e.g. passive routers). */
  passive?: boolean;
}

/** A physical or logical link drawn between two nodes. */
export interface TopologyLink {
  from: string;
  to: string;
  style?: "solid" | "dashed";
}

/** One conceptual stage of the exchange, shown in the sidebar and detail panel. */
export interface ProtocolStep {
  title: string;
  summary: string;
  detail: string;
  facts?: { label: string; value: string }[];
}

/** Colour families used by the packet legend and both diagrams. */
export type PacketKind =
  | "dns"
  | "transport"
  | "request"
  | "response"
  | "secure"
  | "control"
  | "media";

/** A single frame on the wire. */
export interface Packet {
  /** Seconds since the capture started. */
  t: number;
  from: string;
  to: string;
  /** Protocol column in the packet table, e.g. "TCP", "DNS". */
  protocol: string;
  /** Summary line, written in the style of a packet analyser. */
  info: string;
  /** Human-readable size, e.g. "66 B" or "12.8 KB". */
  size: string;
  kind: PacketKind;
  /** Index into the protocol's `steps`. */
  step: number;
  /** Short label painted on the arrow in the sequence view. */
  label: string;
  /** Payload preview shown in the step detail panel. */
  payload?: string;
}

export type ProtocolCategory = "core" | "application" | "security";

export interface Protocol {
  id: string;
  name: string;
  fullName: string;
  /** One-line description shown in the sidebar. */
  tagline: string;
  category: ProtocolCategory;
  /** OSI layer, 1-7. */
  layer: number;
  layerName: string;
  port: string;
  transport: string;
  format: string;
  rfc: string;
  /** Extra key/value rows for the overview panel. */
  extra?: { label: string; value: string }[];
  description: string;
  nodes: TopologyNode[];
  links: TopologyLink[];
  steps: ProtocolStep[];
  packets: Packet[];
}
