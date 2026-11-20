import { protocolsById } from "@/data";
import { StackDiagram } from "@/components/StackDiagram";

/** Temporary harness: server-renders the stack view at fixed progress points. */
export default function StackCheck() {
  const ids = ["http", "doh", "tcp", "ip", "arp"];
  const points = [0.02, 0.2, 0.38, 0.5, 0.62, 0.8, 0.99];

  return (
    <div>
      {ids.map((id) => {
        const protocol = protocolsById.get(id);
        if (!protocol) return <div key={id}>MISSING {id}</div>;
        const packet = protocol.packets[0];
        return (
          <div key={id}>
            {points.map((p) => (
              <div key={p} data-probe={`${id}@${p}`}>
                <StackDiagram
                  protocol={protocol}
                  flight={{ packet, progress: p }}
                  lastPacket={packet}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
