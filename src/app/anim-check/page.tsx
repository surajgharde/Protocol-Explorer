import { protocolsById } from "@/data";
import { NetworkDiagram } from "@/components/NetworkDiagram";

/** Temporary harness: the network map frozen at fixed points of one flight. */
export default function AnimCheck() {
  const protocol = protocolsById.get("http");
  if (!protocol) return <div>missing</div>;
  // A packet that has to cross the whole topology, so the per-hop dwell shows.
  const packet =
    protocol.packets.find((p) => p.from === "client" && p.to !== "router") ??
    protocol.packets[0];
  const points = [0.08, 0.26, 0.42, 0.5, 0.62, 0.78, 0.94];

  return (
    <div style={{ background: "#fff" }}>
      <div style={{ font: "12px monospace", padding: 6 }}>
        {packet.from} → {packet.to} · {packet.label}
      </div>
      {points.map((p) => (
        <div
          key={p}
          style={{ width: 700, height: 420, display: "flex", borderBottom: "1px solid #ccc" }}
        >
          <NetworkDiagram
            protocol={protocol}
            flight={{ packet, progress: p }}
            lastPacket={packet}
          />
        </div>
      ))}
    </div>
  );
}
