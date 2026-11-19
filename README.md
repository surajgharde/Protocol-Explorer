# Protocol Explorer

An interactive way to learn how the internet works. Pick one of twenty-one
protocols and watch it run packet by packet across a network map and a sequence
diagram, with an annotated capture table underneath and an explanation of the
step currently on screen.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm start    # production
npm run typecheck             # tsc --noEmit
```

Deploys to Vercel with no configuration — it is a stock Next.js App Router
project with no server-side dependencies, no database and no environment
variables.

## What is in it

| Category | Protocols |
| --- | --- |
| Application | HTTP, DNS, WebSocket, QUIC/HTTP3, SMTP, IMAP, FTP, WebRTC |
| Core | TCP, UDP, IP, ARP, DHCP, ICMP, BGP, NTP |
| Security | HTTPS, TLS 1.3, SSH, DNS over HTTPS, WireGuard |

Each one carries a topology, four or five conceptual steps, and a hand-written
packet trace in the style of a protocol analyser.

## How it is put together

```
src/
  data/
    types.ts            Protocol, Packet, TopologyNode and friends
    topology.ts         Shared device presets and the nodes()/links() helpers
    protocols/          The catalogue, split by category
    index.ts            Merged list, category counts, OSI layer helpers
  lib/
    usePlayback.ts      The animation clock
    packetKinds.ts      Packet colour families and time formatting
    routing.ts          Wire-following paths and arc-length interpolation
  components/
    Header, ProtocolRail, NetworkDiagram, SequenceDiagram,
    CapturePanel, DetailPanel, CommandPalette, NodeGlyph, Icons
  app/
    globals.css         The whole design system, as CSS custom properties
```

Three ideas hold it together:

**Playback is one number.** `usePlayback` tracks a single float in `[0, n]`. The
integer part is how many packets have landed; any fraction is the packet still
in the air. The capture table, the network map, the sequence diagram and the
sidebar checkmarks all read from that one value instead of trying to stay in
step with each other.

**Packet colour means one thing everywhere.** A packet's `kind` picks a CSS
custom property, used identically by the legend, the dot crossing the network
map, the sequence arrow and the row badge in the table.

**Packets follow the wires.** The network map runs a breadth-first search over
the drawn links, so a packet from the client to a root nameserver visibly
travels via the router and the resolver rather than cutting across the diagram.

**Every device is a disc.** Glyphs are drawn at wildly different sizes — a
laptop is wide and short, a server tall and narrow — so each sits on a disc of
one radius. That gives the map a single repeating shape, and it lets wires be
trimmed to the disc edge so they stop cleanly at a device instead of running
underneath it. The disc is also what carries state: it fills with the accent
colour and throws an expanding ring while its device is the one talking. The
wire being crossed takes the packet's own colour and flows in the direction of
travel, and the packet itself is an orb with a pulsing halo trailing the route
it has covered so far.

## Adding a protocol

Append an object to the right file in `src/data/protocols/`. Nothing else needs
touching — the sidebar, the category counts, the OSI layer filter and the search
palette all derive from the catalogue.

```ts
{
  id: "mqtt",
  name: "MQTT",
  fullName: "Message Queuing Telemetry Transport",
  tagline: "Publish and subscribe for small devices",
  category: "application",
  layer: 7,
  layerName: "Application (Layer 7)",
  port: "1883, 8883 with TLS",
  transport: "TCP",
  format: "Two byte fixed header plus payload",
  rfc: "OASIS MQTT 5.0",
  description: "…",
  nodes: nodes("client", ["app", { label: "Broker" }]),
  links: links("client-app"),
  steps: [{ title: "Connect", summary: "…", detail: "…" }],
  packets: [
    { t: 0, from: "client", to: "app", protocol: "MQTT",
      info: "Connect Command", size: "54 B",
      kind: "request", step: 0, label: "CONNECT" },
  ],
}
```

`nodes()` pulls from the shared presets in `topology.ts` so a laptop always
appears in the same place, and the second tuple element overrides any field.
`links("a-b", "b-c~")` builds the link list, where a trailing `~` means dashed.
`step` indexes into `steps`, and packets must be ordered by `t`.

## Keyboard

| Key | Action |
| --- | --- |
| `Ctrl` `K` | Search protocols |
| `Space` | Play or pause |
| `→` / `←` | Step forward or back one packet |
| `R` | Reset the capture |
| `V` | Switch between network and sequence views |
| `?` | Show the shortcut list |

## A note on the data

The captures are written to teach rather than to be replayed. Timings are
realistic but illustrative, routine acknowledgements are trimmed, and addresses
use the documentation ranges reserved by RFC 5737 (`192.0.2.0/24`,
`198.51.100.0/24`, `203.0.113.0/24`). Header fields, port numbers, status codes
and message sequences follow the actual specifications.
