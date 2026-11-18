import type { TopologyNode } from "./types";

/**
 * Shared device presets. Every protocol picks the handful it needs, so a laptop
 * always sits in the same place no matter which exchange you are watching.
 * Coordinates are in the 1000x520 viewBox used by the network map.
 */
const presets = {
  client: { id: "client", label: "Client", sublabel: "192.168.1.10", kind: "laptop", x: 130, y: 360 },
  phone: { id: "phone", label: "Phone", sublabel: "192.168.1.22", kind: "phone", x: 130, y: 150 },
  router: { id: "router", label: "Router", sublabel: "192.168.1.1", kind: "router", x: 395, y: 275 },
  switch: { id: "switch", label: "Switch", sublabel: "8 ports", kind: "switch", x: 395, y: 110 },
  internet: { id: "internet", label: "Internet", sublabel: "", kind: "cloud", x: 640, y: 420, passive: true },
  resolver: { id: "resolver", label: "DNS Resolver", sublabel: "8.8.8.8", kind: "rack", x: 640, y: 120 },
  root: { id: "root", label: "Root Server", sublabel: "198.41.0.4", kind: "rack", x: 870, y: 60 },
  tld: { id: "tld", label: ".com TLD Server", sublabel: "192.5.6.30", kind: "rack", x: 870, y: 190 },
  authoritative: { id: "authoritative", label: "Authoritative NS", sublabel: "198.51.100.53", kind: "rack", x: 870, y: 320 },
  web: { id: "web", label: "Web Server", sublabel: "203.0.113.10", kind: "server", x: 880, y: 130 },
  app: { id: "app", label: "App Server", sublabel: "10.0.0.20", kind: "server", x: 880, y: 390 },
  mail: { id: "mail", label: "Mail Server", sublabel: "198.51.100.25", kind: "server", x: 880, y: 300 },
  file: { id: "file", label: "File Server", sublabel: "192.168.1.20", kind: "rack", x: 640, y: 120 },
  proxy: { id: "proxy", label: "Proxy", sublabel: "192.0.2.80", kind: "shield", x: 640, y: 255 },
  gateway: { id: "gateway", label: "VPN Gateway", sublabel: "198.51.100.9", kind: "shield", x: 640, y: 255 },
  peer: { id: "peer", label: "Their Laptop", sublabel: "192.168.0.23", kind: "laptop", x: 880, y: 390 },
  camera: { id: "camera", label: "IP Camera", sublabel: "192.168.1.64", kind: "camera", x: 640, y: 120 },
  tv: { id: "tv", label: "TV Box", sublabel: "192.168.1.30", kind: "tv", x: 130, y: 150 },
  isp: { id: "isp", label: "ISP Router", sublabel: "AS 64500", kind: "router", x: 395, y: 275 },
  transit: { id: "transit", label: "Transit Router", sublabel: "AS 64510", kind: "router", x: 640, y: 180 },
  hosting: { id: "hosting", label: "Hosting Router", sublabel: "AS 64511", kind: "router", x: 880, y: 275 },
  access: { id: "access", label: "Access Server", sublabel: "198.51.100.1", kind: "rack", x: 640, y: 255 },
  plc: { id: "plc", label: "PLC", sublabel: "10.10.0.5", kind: "printer", x: 640, y: 255 },
} satisfies Record<string, TopologyNode>;

export type PresetId = keyof typeof presets;

/**
 * Build a node list from presets, optionally overriding any field — handy when
 * a protocol needs the same device under a different name or position.
 */
export function nodes(
  ...picks: (PresetId | [PresetId, Partial<TopologyNode>])[]
): TopologyNode[] {
  return picks.map((pick) => {
    if (Array.isArray(pick)) return { ...presets[pick[0]], ...pick[1] };
    return { ...presets[pick] };
  });
}

/** Shorthand for a link list: `links("client-router", "router-internet")`. */
export function links(...pairs: string[]) {
  return pairs.map((pair) => {
    const dashed = pair.endsWith("~");
    const [from, to] = (dashed ? pair.slice(0, -1) : pair).split("-");
    return { from, to, style: dashed ? ("dashed" as const) : ("solid" as const) };
  });
}
