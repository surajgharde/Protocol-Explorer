import type { Protocol, ProtocolCategory } from "./types";
import { coreProtocols } from "./protocols/core";
import { applicationProtocols } from "./protocols/application";
import { securityProtocols } from "./protocols/security";

/** Sidebar order: the web first, then what carries it, then what protects it. */
export const protocols: Protocol[] = [
  ...applicationProtocols,
  ...coreProtocols,
  ...securityProtocols,
];

export const protocolsById = new Map(protocols.map((p) => [p.id, p]));

export const categories: { id: ProtocolCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "application", label: "Application" },
  { id: "core", label: "Core" },
  { id: "security", label: "Security" },
];

export function countByCategory(id: ProtocolCategory | "all") {
  return id === "all"
    ? protocols.length
    : protocols.filter((p) => p.category === id).length;
}

/** OSI layers that at least one protocol in the catalogue sits on. */
export const availableLayers = Array.from(
  new Set(protocols.map((p) => p.layer)),
).sort((a, b) => a - b);

export const layerNames: Record<number, string> = {
  1: "Physical",
  2: "Link",
  3: "Network",
  4: "Transport",
  5: "Session",
  6: "Presentation",
  7: "Application",
};

export * from "./types";
