import type { Protocol } from "../types";
import { links, nodes } from "../topology";

export const coreProtocols: Protocol[] = [
  {
    id: "tcp",
    name: "TCP",
    fullName: "Transmission Control Protocol",
    tagline: "Reliable, ordered byte streams",
    category: "core",
    layer: 4,
    layerName: "Transport (Layer 4)",
    port: "Any (16-bit port numbers)",
    transport: "Runs directly over IP",
    format: "Segments with a 20-60 byte header",
    rfc: "RFC 9293",
    extra: [
      { label: "RELIABILITY", value: "Acknowledgements and retransmission" },
      { label: "ORDERING", value: "Sequence numbers reassemble the stream" },
    ],
    description:
      "TCP turns the unreliable packet delivery of IP into a stream of bytes that arrives in order and without gaps. It opens with a three-way handshake, numbers every byte it sends, and expects an acknowledgement for each one. Anything that goes unacknowledged is sent again, and a sliding window keeps the sender from overwhelming either the receiver or the network.",
    nodes: nodes("client", ["web", { label: "Server", sublabel: "203.0.113.10" }]),
    links: links("client-web"),
    steps: [
      {
        title: "Three-way handshake",
        summary: "SYN, SYN-ACK, ACK",
        detail:
          "The client picks a random initial sequence number and sends a SYN. The server answers with its own SYN plus an ACK of the client's number, and the client acknowledges in turn. After these three segments both sides know the other is reachable and have agreed on starting sequence numbers, the maximum segment size and any options such as window scaling.",
        facts: [
          { label: "SEGMENTS", value: "3" },
          { label: "COST", value: "One full round trip before any data" },
        ],
      },
      {
        title: "Data transfer",
        summary: "Bytes out, acknowledgements back",
        detail:
          "Each segment carries a sequence number for its first byte. The receiver returns an ACK naming the next byte it expects, which implicitly confirms everything before it. The sender may have several segments outstanding at once — as many as the window allows — so it does not have to wait for an acknowledgement before sending more.",
        facts: [
          { label: "MSS", value: "1460 bytes on a typical Ethernet path" },
          { label: "ACKS", value: "Cumulative — one ACK covers many segments" },
        ],
      },
      {
        title: "Flow and congestion control",
        summary: "The window decides how fast you may send",
        detail:
          "Every ACK advertises a receive window: the amount of data the receiver still has room for. The sender also keeps a congestion window that grows while the path looks healthy and collapses when loss appears. The smaller of the two caps how much data can be in flight, which is how TCP shares a link fairly with everyone else using it.",
        facts: [
          { label: "LIMIT", value: "min(receive window, congestion window)" },
          { label: "START", value: "Slow start doubles the window each round trip" },
        ],
      },
      {
        title: "Loss recovery",
        summary: "Retransmit what was never acknowledged",
        detail:
          "If an acknowledgement does not arrive before the retransmission timer fires, or three duplicate ACKs suggest a gap, the sender repeats the missing segment. Selective acknowledgement (SACK) lets the receiver report exactly which ranges did arrive, so only the real hole is resent rather than everything after it.",
        facts: [
          { label: "TRIGGER", value: "Timeout or three duplicate ACKs" },
          { label: "SACK", value: "Reports the ranges already received" },
        ],
      },
      {
        title: "Graceful close",
        summary: "FIN in each direction",
        detail:
          "Closing is independent per direction. Each side sends a FIN when it has no more data, and the other acknowledges it. The side that closes first waits in TIME_WAIT for twice the maximum segment lifetime, so that stray duplicates from this connection cannot be mistaken for data on a new one reusing the same port pair.",
        facts: [
          { label: "SEGMENTS", value: "FIN and ACK in both directions" },
          { label: "TIME_WAIT", value: "Typically 60 seconds" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [SYN] Seq=0 Win=64240 MSS=1460 SACK_PERM", size: "74 B", kind: "transport", step: 0, label: "SYN", payload: "Flags: SYN  ·  Seq=0  ·  Win=64240" },
      { t: 0.018, from: "web", to: "client", protocol: "TCP", info: "443 → 52344 [SYN, ACK] Seq=0 Ack=1 Win=65535 MSS=1460", size: "74 B", kind: "transport", step: 0, label: "SYN-ACK", payload: "Flags: SYN, ACK  ·  Seq=0  ·  Ack=1" },
      { t: 0.036, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [ACK] Seq=1 Ack=1 Win=64240", size: "66 B", kind: "transport", step: 0, label: "ACK", payload: "Flags: ACK  ·  connection ESTABLISHED" },
      { t: 0.037, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [PSH, ACK] Seq=1 Ack=1 Len=517", size: "583 B", kind: "request", step: 1, label: "DATA Len=517" },
      { t: 0.055, from: "web", to: "client", protocol: "TCP", info: "443 → 52344 [ACK] Seq=1 Ack=518 Win=64000", size: "66 B", kind: "transport", step: 1, label: "ACK 518" },
      { t: 0.057, from: "web", to: "client", protocol: "TCP", info: "443 → 52344 [ACK] Seq=1 Ack=518 Len=1460", size: "1.5 KB", kind: "response", step: 1, label: "DATA Seq=1" },
      { t: 0.059, from: "web", to: "client", protocol: "TCP", info: "443 → 52344 [ACK] Seq=1461 Ack=518 Len=1460", size: "1.5 KB", kind: "response", step: 2, label: "DATA Seq=1461" },
      { t: 0.078, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [ACK] Seq=518 Ack=2921 Win=32128 (window shrinking)", size: "66 B", kind: "transport", step: 2, label: "ACK · window 32 KB" },
      { t: 0.3, from: "web", to: "client", protocol: "TCP", info: "[TCP Retransmission] 443 → 52344 Seq=2921 Len=1460", size: "1.5 KB", kind: "control", step: 3, label: "RETRANSMIT" },
      { t: 0.318, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [ACK] Seq=518 Ack=4381 SLE=4381 SRE=5841", size: "78 B", kind: "transport", step: 3, label: "SACK" },
      { t: 0.52, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [FIN, ACK] Seq=518 Ack=5841", size: "66 B", kind: "transport", step: 4, label: "FIN" },
      { t: 0.538, from: "web", to: "client", protocol: "TCP", info: "443 → 52344 [FIN, ACK] Seq=5841 Ack=519", size: "66 B", kind: "transport", step: 4, label: "FIN-ACK" },
      { t: 0.556, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [ACK] Seq=519 Ack=5842", size: "66 B", kind: "transport", step: 4, label: "ACK" },
    ],
  },

  {
    id: "udp",
    name: "UDP",
    fullName: "User Datagram Protocol",
    tagline: "Fire-and-forget datagrams",
    category: "core",
    layer: 4,
    layerName: "Transport (Layer 4)",
    port: "Any (16-bit port numbers)",
    transport: "Runs directly over IP",
    format: "Datagrams with an 8 byte header",
    rfc: "RFC 768",
    extra: [
      { label: "RELIABILITY", value: "None — the application handles loss" },
      { label: "USED BY", value: "DNS, QUIC, games, voice and video" },
    ],
    description:
      "UDP adds almost nothing to IP: a source port, a destination port, a length and a checksum. There is no handshake, no acknowledgement and no retransmission, so a datagram either arrives or it does not. That makes it the right choice when a late packet is worse than a missing one — live audio, game state, DNS lookups — and the foundation QUIC builds its own reliability on.",
    nodes: nodes("client", ["app", { label: "Game Server", sublabel: "203.0.113.44" }]),
    links: links("client-app"),
    steps: [
      {
        title: "No handshake",
        summary: "The first datagram is already the data",
        detail:
          "A UDP sender does not ask permission. The very first packet carries payload, which is why a DNS lookup can complete in a single round trip while a TCP connection is still shaking hands. The cost is that nothing confirms the far end was listening at all.",
        facts: [
          { label: "SETUP COST", value: "Zero round trips" },
          { label: "HEADER", value: "8 bytes — ports, length, checksum" },
        ],
      },
      {
        title: "Datagrams in both directions",
        summary: "Each one stands alone",
        detail:
          "Every datagram is independent. There are no sequence numbers, so the receiver cannot tell whether two datagrams arrived in the order they were sent — or whether one in between went missing. Applications that care add their own counters inside the payload, exactly as this game does with its input sequence numbers.",
        facts: [
          { label: "ORDERING", value: "Not guaranteed" },
          { label: "BOUNDARIES", value: "Preserved — one send is one receive" },
        ],
      },
      {
        title: "Loss is simply loss",
        summary: "Nothing retransmits it for you",
        detail:
          "When input sequence 3 disappears on the way to the server, no part of the network notices or repairs it. For a fast-paced game that is the right outcome: by the time a retransmission arrived the moment would have passed, and the next input is more useful than the stale one.",
        facts: [
          { label: "RECOVERY", value: "None at the transport layer" },
          { label: "TRADE", value: "Latency over completeness" },
        ],
      },
      {
        title: "The application catches up",
        summary: "State snapshots paper over the gap",
        detail:
          "Because each world-state update contains the full picture rather than a delta, the client recovers automatically on the next tick. Applications that do need reliability build it themselves on top of UDP — which is precisely what QUIC does, adding acknowledgements, ordering and congestion control in user space.",
        facts: [
          { label: "PATTERN", value: "Idempotent snapshots, not deltas" },
          { label: "SEE ALSO", value: "QUIC adds reliability over UDP" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "app", protocol: "UDP", info: "52344 → 7777 Len=48 (player input, seq 1)", size: "76 B", kind: "request", step: 0, label: "INPUT seq=1" },
      { t: 0.016, from: "app", to: "client", protocol: "UDP", info: "7777 → 52344 Len=220 (world state, tick 1)", size: "248 B", kind: "response", step: 1, label: "STATE tick=1" },
      { t: 0.033, from: "client", to: "app", protocol: "UDP", info: "52344 → 7777 Len=48 (player input, seq 2)", size: "76 B", kind: "request", step: 1, label: "INPUT seq=2" },
      { t: 0.049, from: "app", to: "client", protocol: "UDP", info: "7777 → 52344 Len=220 (world state, tick 2)", size: "248 B", kind: "response", step: 2, label: "STATE tick=2" },
      { t: 0.066, from: "client", to: "app", protocol: "UDP", info: "52344 → 7777 Len=48 (player input, seq 3) — never arrives", size: "76 B", kind: "control", step: 2, label: "INPUT seq=3 · LOST" },
      { t: 0.099, from: "client", to: "app", protocol: "UDP", info: "52344 → 7777 Len=48 (player input, seq 4)", size: "76 B", kind: "request", step: 3, label: "INPUT seq=4" },
      { t: 0.115, from: "app", to: "client", protocol: "UDP", info: "7777 → 52344 Len=220 (world state, tick 4 — full snapshot)", size: "248 B", kind: "response", step: 3, label: "STATE tick=4" },
    ],
  },

  {
    id: "ip",
    name: "IP",
    fullName: "Internet Protocol",
    tagline: "Addressing and hop-by-hop delivery",
    category: "core",
    layer: 3,
    layerName: "Network (Layer 3)",
    port: "None — IP sits below ports",
    transport: "Carried in link-layer frames",
    format: "Packets with a 20 byte IPv4 header",
    rfc: "RFC 791, RFC 8200",
    extra: [
      { label: "ADDRESSES", value: "32-bit (IPv4) or 128-bit (IPv6)" },
      { label: "DELIVERY", value: "Best effort — nothing is guaranteed" },
    ],
    description:
      "IP is the one protocol every device on the internet must speak. It gives each interface an address and defines a packet header holding a source, a destination and a time-to-live. Every router along the way looks at the destination, consults its routing table, decrements the TTL and forwards the packet one hop closer. Nothing promises it will arrive.",
    nodes: nodes("client", "router", ["transit", { x: 640, y: 255 }], "hosting", ["web", { y: 130 }]),
    links: links("client-router", "router-transit", "transit-hosting", "hosting-web"),
    steps: [
      {
        title: "The packet is built",
        summary: "Source, destination and a TTL of 64",
        detail:
          "The operating system wraps the transport segment in an IP header carrying its own address as the source, the server's as the destination, and a time-to-live that starts at 64 on most systems. The TTL is a loop guard: if routing ever goes circular the counter reaches zero and the packet is discarded instead of circling forever.",
        facts: [
          { label: "INITIAL TTL", value: "64 on Linux and macOS, 128 on Windows" },
          { label: "HEADER", value: "20 bytes without options" },
        ],
      },
      {
        title: "The first hop and NAT",
        summary: "A private address becomes a public one",
        detail:
          "The home router is the default gateway for anything outside 192.168.1.0/24. Because the client's address is private and unroutable on the internet, the router rewrites the source to its own public address and records the translation in a table, so it can reverse it when the reply comes back.",
        facts: [
          { label: "PRIVATE RANGES", value: "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16" },
          { label: "NAT STATE", value: "Keyed by address and port pair" },
        ],
      },
      {
        title: "Hop by hop across the core",
        summary: "Each router decrements the TTL",
        detail:
          "No router knows the whole path. Each one matches the destination against the longest prefix in its routing table, forwards the packet out of the matching interface and decrements the TTL by one. A packet typically crosses between ten and twenty routers to get across a continent.",
        facts: [
          { label: "LOOKUP", value: "Longest prefix match" },
          { label: "STATE", value: "Routers hold no per-connection state" },
        ],
      },
      {
        title: "Fragmentation",
        summary: "Too big for the next link",
        detail:
          "If a packet is larger than the next link's MTU, IPv4 may split it into fragments that each carry an offset and a more-fragments flag. Only the destination reassembles them. IPv6 removed this from routers entirely — there, an oversized packet is dropped and an ICMP message tells the sender to use a smaller one.",
        facts: [
          { label: "TYPICAL MTU", value: "1500 bytes on Ethernet" },
          { label: "IPv6", value: "Routers never fragment; senders must adapt" },
        ],
      },
      {
        title: "Delivery and reassembly",
        summary: "The destination puts it back together",
        detail:
          "The receiving host collects fragments sharing an identification field, orders them by offset and hands the reassembled payload up to TCP or UDP. If any fragment is missing when the reassembly timer expires, the whole packet is discarded — one reason fragmentation is avoided wherever possible.",
        facts: [
          { label: "KEYED BY", value: "Source, destination, protocol, identification" },
          { label: "TIMEOUT", value: "Typically 30 to 60 seconds" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "router", protocol: "IPv4", info: "192.168.1.10 → 203.0.113.10, TTL=64, Len=1500, Proto=TCP", size: "1.5 KB", kind: "request", step: 0, label: "TTL=64" },
      { t: 0.004, from: "router", to: "transit", protocol: "IPv4", info: "198.51.100.7 → 203.0.113.10, TTL=63 (source rewritten by NAT)", size: "1.5 KB", kind: "request", step: 1, label: "NAT · TTL=63" },
      { t: 0.021, from: "transit", to: "hosting", protocol: "IPv4", info: "198.51.100.7 → 203.0.113.10, TTL=62, next hop AS 64511", size: "1.5 KB", kind: "request", step: 2, label: "TTL=62" },
      { t: 0.038, from: "hosting", to: "web", protocol: "IPv4", info: "198.51.100.7 → 203.0.113.10, TTL=61, delivered", size: "1.5 KB", kind: "request", step: 2, label: "TTL=61" },
      { t: 0.056, from: "web", to: "hosting", protocol: "IPv4", info: "203.0.113.10 → 198.51.100.7, Len=4000 — exceeds the 1500 byte MTU", size: "4.0 KB", kind: "response", step: 3, label: "FRAGMENT 1/3" },
      { t: 0.058, from: "hosting", to: "transit", protocol: "IPv4", info: "Fragment offset=185, MF=1, ID=0x5c12", size: "1.5 KB", kind: "response", step: 3, label: "FRAGMENT 2/3" },
      { t: 0.06, from: "transit", to: "router", protocol: "IPv4", info: "Fragment offset=370, MF=0, ID=0x5c12", size: "1.1 KB", kind: "response", step: 3, label: "FRAGMENT 3/3" },
      { t: 0.078, from: "router", to: "client", protocol: "IPv4", info: "Reassembled, 4000 bytes handed up to TCP", size: "4.0 KB", kind: "response", step: 4, label: "REASSEMBLED" },
    ],
  },

  {
    id: "arp",
    name: "ARP",
    fullName: "Address Resolution Protocol",
    tagline: "Finding the MAC behind an IP",
    category: "core",
    layer: 2,
    layerName: "Link (Layer 2)",
    port: "None — EtherType 0x0806",
    transport: "Ethernet frames, never routed",
    format: "28 byte fixed request or reply",
    rfc: "RFC 826",
    extra: [
      { label: "SCOPE", value: "One broadcast domain only" },
      { label: "IPv6", value: "Replaced by Neighbour Discovery" },
    ],
    description:
      "An IP address is useless on a local Ethernet segment — switches forward on hardware addresses. ARP bridges the two: a host broadcasts a question asking who owns an IP, and the owner answers with its MAC address. The answer is cached for a few minutes so the question is not asked for every packet.",
    nodes: nodes(
      "client",
      ["switch", { x: 420, y: 275 }],
      ["router", { x: 720, y: 140, label: "Gateway", sublabel: "192.168.1.1" }],
      ["file", { x: 720, y: 400, label: "NAS", sublabel: "192.168.1.20" }],
    ),
    links: links("client-switch", "switch-router", "switch-file"),
    steps: [
      {
        title: "Cache miss",
        summary: "The IP is known, the MAC is not",
        detail:
          "The client wants to reach the internet, so it needs to hand the frame to its default gateway at 192.168.1.1. Its ARP cache has no entry for that address — perhaps it just booted, or the entry aged out — so the frame cannot be addressed yet and waits while ARP runs.",
        facts: [
          { label: "INSPECT", value: "arp -a shows the current cache" },
          { label: "ENTRY LIFETIME", value: "60 seconds to a few hours" },
        ],
      },
      {
        title: "Broadcast the question",
        summary: "Who has 192.168.1.1?",
        detail:
          "The request goes to the broadcast MAC address ff:ff:ff:ff:ff:ff, so the switch floods it out of every port except the one it arrived on. Every device on the segment receives and inspects it; all but one discard it. The request also carries the sender's own IP and MAC, which lets listeners update their caches for free.",
        facts: [
          { label: "DESTINATION", value: "ff:ff:ff:ff:ff:ff (broadcast)" },
          { label: "SEEN BY", value: "Every host in the broadcast domain" },
        ],
      },
      {
        title: "The owner replies",
        summary: "A unicast answer back",
        detail:
          "Only the host holding 192.168.1.1 answers, and it answers directly to the asker rather than to everyone. The reply carries the hardware address the client needed. Because ARP has no authentication, any host on the segment could answer falsely — the basis of ARP spoofing, which switch port security and dynamic ARP inspection exist to contain.",
        facts: [
          { label: "REPLY TYPE", value: "Unicast back to the requester" },
          { label: "SECURITY", value: "None — any host may claim any IP" },
        ],
      },
      {
        title: "Cache and send",
        summary: "The real frame finally leaves",
        detail:
          "The client stores the mapping and builds the Ethernet frame with the gateway's MAC as the destination. The switch has by now learned which port that MAC lives on, so the frame is forwarded to one port rather than flooded. Every subsequent packet bound for the internet reuses the same cached entry.",
        facts: [
          { label: "SWITCH", value: "Learns MAC to port from source addresses" },
          { label: "NEXT PACKETS", value: "No ARP until the entry expires" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "switch", protocol: "ARP", info: "Who has 192.168.1.1? Tell 192.168.1.10", size: "42 B", kind: "control", step: 1, label: "WHO HAS 192.168.1.1?", payload: "Target IP 192.168.1.1  ·  Target MAC 00:00:00:00:00:00" },
      { t: 0.001, from: "switch", to: "file", protocol: "ARP", info: "Broadcast flooded to all ports — the NAS ignores it", size: "42 B", kind: "control", step: 1, label: "FLOOD" },
      { t: 0.002, from: "switch", to: "router", protocol: "ARP", info: "Broadcast flooded to all ports — the gateway matches", size: "42 B", kind: "control", step: 1, label: "FLOOD" },
      { t: 0.004, from: "router", to: "switch", protocol: "ARP", info: "192.168.1.1 is at 3c:22:fb:11:0a:9e", size: "42 B", kind: "response", step: 2, label: "IS AT 3c:22:fb:11:0a:9e" },
      { t: 0.005, from: "switch", to: "client", protocol: "ARP", info: "Unicast reply forwarded on port 3", size: "42 B", kind: "response", step: 2, label: "REPLY" },
      { t: 0.006, from: "client", to: "switch", protocol: "IPv4", info: "Frame to 3c:22:fb:11:0a:9e, payload 1500 bytes", size: "1.5 KB", kind: "request", step: 3, label: "DATA FRAME" },
      { t: 0.007, from: "switch", to: "router", protocol: "IPv4", info: "Forwarded on port 1 — MAC table hit, no flooding", size: "1.5 KB", kind: "request", step: 3, label: "FORWARD" },
    ],
  },

  {
    id: "dhcp",
    name: "DHCP",
    fullName: "Dynamic Host Configuration Protocol",
    tagline: "Getting an address automatically",
    category: "core",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "67 server, 68 client",
    transport: "UDP",
    format: "Fixed header plus tagged options",
    rfc: "RFC 2131",
    extra: [
      { label: "SEQUENCE", value: "Discover, Offer, Request, Ack" },
      { label: "LEASE", value: "Time-limited and renewable" },
    ],
    description:
      "A device joining a network knows nothing: not its own address, not the gateway, not which resolver to ask. DHCP fills all of that in. The client broadcasts for help, a server offers a free address from its pool, the client formally requests it, and the server acknowledges — handing over a lease plus the gateway, netmask and DNS servers in one exchange.",
    nodes: nodes("client", ["switch", { x: 420, y: 275 }], ["router", { x: 740, y: 275, label: "DHCP Server", sublabel: "192.168.1.1" }]),
    links: links("client-switch", "switch-router"),
    steps: [
      {
        title: "Discover",
        summary: "A broadcast into the dark",
        detail:
          "With no address of its own, the client sends from 0.0.0.0 to the broadcast address 255.255.255.255. It includes a random transaction ID so it can match the eventual answer, and a parameter request list naming the settings it hopes to receive.",
        facts: [
          { label: "SOURCE", value: "0.0.0.0:68" },
          { label: "DESTINATION", value: "255.255.255.255:67" },
        ],
      },
      {
        title: "Offer",
        summary: "Here is an address you may have",
        detail:
          "Any DHCP server on the segment may answer with an offer: a candidate address from its pool, plus the lease length and the network settings. If several servers respond, the client simply takes the first acceptable offer. The address is only tentatively reserved at this point.",
        facts: [
          { label: "POOL", value: "192.168.1.10 - 192.168.1.200" },
          { label: "LEASE", value: "86400 seconds (24 hours)" },
        ],
      },
      {
        title: "Request",
        summary: "Claiming the offer publicly",
        detail:
          "The client broadcasts its acceptance rather than unicasting it, naming both the address it wants and the server it is accepting from. The broadcast tells any other server that also made an offer that it may return that address to its pool.",
        facts: [
          { label: "STILL BROADCAST", value: "The lease is not final yet" },
          { label: "NAMES", value: "The chosen server identifier" },
        ],
      },
      {
        title: "Acknowledge",
        summary: "The lease is committed",
        detail:
          "The server writes the binding to its lease database and sends an ACK carrying the full configuration: address, netmask, default gateway, DNS servers, domain name and often an NTP server. Many clients then send a gratuitous ARP for the new address to check nobody else is already using it.",
        facts: [
          { label: "GATEWAY", value: "192.168.1.1" },
          { label: "DNS", value: "8.8.8.8 and 8.8.4.4" },
        ],
      },
      {
        title: "Renewal",
        summary: "Half-way through, ask again",
        detail:
          "At T1 — half the lease — the client unicasts a request straight to the server that granted it, skipping discovery entirely. A successful ACK resets the clock. If the server never answers, the client broadcasts at T2 (87.5% of the lease) and only starts over from Discover once the lease truly expires.",
        facts: [
          { label: "T1", value: "50% of the lease" },
          { label: "T2", value: "87.5% of the lease" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "router", protocol: "DHCP", info: "Discover — Transaction ID 0x3f2a1b, from 0.0.0.0", size: "342 B", kind: "control", step: 0, label: "DISCOVER (broadcast)", payload: "Client MAC a4:83:e7:2c:91:04  ·  Requested options 1, 3, 6, 15, 42" },
      { t: 0.034, from: "router", to: "client", protocol: "DHCP", info: "Offer — 192.168.1.10, lease 86400s, server 192.168.1.1", size: "342 B", kind: "control", step: 1, label: "OFFER 192.168.1.10" },
      { t: 0.048, from: "client", to: "router", protocol: "DHCP", info: "Request — 192.168.1.10 from server 192.168.1.1", size: "342 B", kind: "control", step: 2, label: "REQUEST" },
      { t: 0.072, from: "router", to: "client", protocol: "DHCP", info: "ACK — mask /24, gateway 192.168.1.1, DNS 8.8.8.8", size: "342 B", kind: "control", step: 3, label: "ACK", payload: "Subnet mask 255.255.255.0  ·  Router 192.168.1.1  ·  DNS 8.8.8.8, 8.8.4.4" },
      { t: 0.09, from: "client", to: "router", protocol: "ARP", info: "Gratuitous ARP — is anyone else using 192.168.1.10?", size: "42 B", kind: "control", step: 3, label: "DUPLICATE CHECK" },
      { t: 43200.0, from: "client", to: "router", protocol: "DHCP", info: "Request — unicast renewal at T1", size: "342 B", kind: "control", step: 4, label: "RENEW" },
      { t: 43200.021, from: "router", to: "client", protocol: "DHCP", info: "ACK — lease extended by another 86400s", size: "342 B", kind: "control", step: 4, label: "ACK" },
    ],
  },

  {
    id: "icmp",
    name: "ICMP",
    fullName: "Internet Control Message Protocol",
    tagline: "Ping, traceroute and error reports",
    category: "core",
    layer: 3,
    layerName: "Network (Layer 3)",
    port: "None — IP protocol 1",
    transport: "Carried directly in IP packets",
    format: "Type, code, checksum and payload",
    rfc: "RFC 792, RFC 4443",
    extra: [
      { label: "ECHO", value: "Type 8 request, type 0 reply" },
      { label: "ERRORS", value: "Unreachable, TTL exceeded, too big" },
    ],
    description:
      "ICMP is how the network talks about itself. It carries no application data — it reports problems and answers diagnostic questions. Ping uses its echo request and reply to measure a round trip, traceroute abuses the TTL-exceeded message to map a path, and path MTU discovery depends entirely on its fragmentation-needed reports.",
    nodes: nodes("client", "router", ["transit", { x: 640, y: 255 }], ["web", { y: 255, label: "Target Host", sublabel: "203.0.113.10" }]),
    links: links("client-router", "router-transit", "transit-web"),
    steps: [
      {
        title: "Build the echo",
        summary: "An identifier, a sequence and a payload",
        detail:
          "Ping sends a type 8 message carrying an identifier that distinguishes this ping process from others on the host, a sequence number that increments with each probe, and a payload of filler bytes. The receiver must copy the payload back verbatim, which is what makes the round-trip time meaningful.",
        facts: [
          { label: "TYPE", value: "8 — Echo request" },
          { label: "PAYLOAD", value: "56 bytes by default on Linux" },
        ],
      },
      {
        title: "Round trip",
        summary: "The reply is the measurement",
        detail:
          "The destination answers with a type 0 echo reply containing the same identifier, sequence and payload. The difference between sending and receiving is the round-trip time. The TTL in the reply also hints at how many hops the return path took — a reply arriving with TTL 55 probably crossed nine routers from an initial 64.",
        facts: [
          { label: "TYPE", value: "0 — Echo reply" },
          { label: "RTT", value: "19 ms in this capture" },
        ],
      },
      {
        title: "Traceroute",
        summary: "Deliberately expiring packets",
        detail:
          "Traceroute sends probes with a TTL of 1, then 2, then 3. Each probe dies one hop further along, and the router that kills it sends back a type 11 time-exceeded message revealing its own address. Repeating this builds the path hop by hop — which is why some hops show as asterisks: those routers are configured not to answer.",
        facts: [
          { label: "TYPE", value: "11 — Time to live exceeded" },
          { label: "TRICK", value: "TTL 1, 2, 3 — each expires one hop later" },
        ],
      },
      {
        title: "Error reports",
        summary: "Unreachable and too big",
        detail:
          "When nothing is listening on a UDP port, the host returns type 3 code 3, port unreachable — which is how classic traceroute knows it has arrived. A router that must drop an oversized packet returns fragmentation-needed with the correct MTU, and a firewall that silently blocks these messages is a common cause of connections that hang after the handshake.",
        facts: [
          { label: "TYPE 3", value: "Destination unreachable, 16 codes" },
          { label: "WARNING", value: "Blocking ICMP breaks path MTU discovery" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "web", protocol: "ICMP", info: "Echo (ping) request id=0x1a2b seq=1/256 ttl=64", size: "74 B", kind: "request", step: 0, label: "ECHO REQUEST" },
      { t: 0.019, from: "web", to: "client", protocol: "ICMP", info: "Echo (ping) reply id=0x1a2b seq=1/256 ttl=55 — 19.0 ms", size: "74 B", kind: "response", step: 1, label: "ECHO REPLY · 19 ms" },
      { t: 1.0, from: "client", to: "router", protocol: "ICMP", info: "Echo request seq=2 ttl=1 — expires at the first hop", size: "74 B", kind: "request", step: 2, label: "PROBE TTL=1" },
      { t: 1.003, from: "router", to: "client", protocol: "ICMP", info: "Time-to-live exceeded in transit — from 192.168.1.1", size: "106 B", kind: "control", step: 2, label: "TTL EXCEEDED · hop 1" },
      { t: 1.01, from: "client", to: "transit", protocol: "ICMP", info: "Echo request seq=3 ttl=2", size: "74 B", kind: "request", step: 2, label: "PROBE TTL=2" },
      { t: 1.029, from: "transit", to: "client", protocol: "ICMP", info: "Time-to-live exceeded in transit — from 198.51.100.1", size: "106 B", kind: "control", step: 2, label: "TTL EXCEEDED · hop 2" },
      { t: 2.0, from: "client", to: "web", protocol: "UDP", info: "Traceroute probe to closed port 33434", size: "74 B", kind: "request", step: 3, label: "PROBE :33434" },
      { t: 2.021, from: "web", to: "client", protocol: "ICMP", info: "Destination unreachable, port unreachable — target reached", size: "106 B", kind: "control", step: 3, label: "PORT UNREACHABLE" },
    ],
  },

  {
    id: "bgp",
    name: "BGP",
    fullName: "Border Gateway Protocol",
    tagline: "How networks learn routes to each other",
    category: "core",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "179",
    transport: "TCP",
    format: "Open, Update, Keepalive, Notification",
    rfc: "RFC 4271",
    extra: [
      { label: "SCALE", value: "Around 950,000 IPv4 prefixes" },
      { label: "DECIDES", value: "Policy first, path length second" },
    ],
    description:
      "The internet is roughly 75,000 independent networks, each called an autonomous system. BGP is how they tell each other which blocks of addresses they can reach and through whom. It is a policy protocol as much as a routing one: the shortest path often loses to the cheapest one, and a single bad announcement can pull traffic for an entire country the wrong way.",
    nodes: nodes("client", "isp", ["transit", { x: 640, y: 180 }], "hosting", ["web", { y: 130 }]),
    links: links("client-isp", "isp-transit", "transit-hosting", "hosting-web"),
    steps: [
      {
        title: "A TCP session on port 179",
        summary: "Neighbours are configured, not discovered",
        detail:
          "BGP peers never find each other automatically. An operator configures the neighbour's address and AS number on both sides, and one opens a plain TCP connection to port 179. Running over TCP means BGP inherits reliable, ordered delivery and does not need to reinvent any of it.",
        facts: [
          { label: "PORT", value: "179 over TCP" },
          { label: "PEERS", value: "Manually configured on both ends" },
        ],
      },
      {
        title: "Open and capabilities",
        summary: "Who you are and what you support",
        detail:
          "Each side sends an OPEN naming its AS number, its router ID and a hold time, along with the capabilities it supports — four-byte AS numbers, multiprotocol extensions for IPv6, route refresh. If the AS numbers do not match what each side was configured to expect, the session is torn down immediately.",
        facts: [
          { label: "HOLD TIME", value: "180 s, negotiated down to the lower value" },
          { label: "ON MISMATCH", value: "Notification, then the session closes" },
        ],
      },
      {
        title: "The table exchange",
        summary: "Everything you know, all at once",
        detail:
          "On a fresh session each peer sends its entire set of best routes. For a full transit peer that is nearly a million prefixes and well over a hundred megabytes, which is why routers at an exchange point need substantial memory. Each prefix arrives with an AS_PATH listing the networks it travelled through — the loop-prevention mechanism and the tiebreaker of last resort.",
        facts: [
          { label: "AS_PATH", value: "Prevents loops and breaks ties" },
          { label: "AFTER THIS", value: "Only changes are sent, never the full table" },
        ],
      },
      {
        title: "Keepalives",
        summary: "Silence means the peer is gone",
        detail:
          "Once converged, a quiet session sends only keepalives, by default every third of the hold time. If none arrives before the hold timer expires, the peer is declared dead and every route learned through it is withdrawn at once — which is how a single fibre cut propagates across the internet in seconds.",
        facts: [
          { label: "INTERVAL", value: "60 seconds (hold time divided by 3)" },
          { label: "MESSAGE", value: "19 bytes — header only" },
        ],
      },
      {
        title: "Withdrawal and reroute",
        summary: "A path disappears, another is chosen",
        detail:
          "When the transit provider loses its own route to 203.0.113.0/24 it sends a withdrawal. The receiving router removes that path, re-runs best-path selection over whatever alternatives remain, and announces the new choice onward. Convergence across the whole internet typically takes tens of seconds — and during that window some traffic is simply lost.",
        facts: [
          { label: "WITHDRAW", value: "Lists prefixes no longer reachable" },
          { label: "CONVERGENCE", value: "Seconds to a few minutes globally" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "isp", to: "transit", protocol: "TCP", info: "51022 → 179 [SYN] — opening the BGP session", size: "74 B", kind: "transport", step: 0, label: "SYN :179" },
      { t: 0.018, from: "transit", to: "isp", protocol: "TCP", info: "179 → 51022 [SYN, ACK]", size: "74 B", kind: "transport", step: 0, label: "SYN-ACK" },
      { t: 0.036, from: "isp", to: "transit", protocol: "BGP", info: "OPEN — AS 64500, Hold 180, Cap: 4-byte ASN, MP-BGP", size: "87 B", kind: "control", step: 1, label: "OPEN · AS 64500" },
      { t: 0.054, from: "transit", to: "isp", protocol: "BGP", info: "OPEN — AS 64510, Hold 180, Router-ID 198.51.100.1", size: "87 B", kind: "control", step: 1, label: "OPEN · AS 64510" },
      { t: 0.072, from: "transit", to: "isp", protocol: "BGP", info: "UPDATE — 203.0.113.0/24, AS_PATH 64510 64511, NEXT_HOP 198.51.100.1", size: "92 B", kind: "response", step: 2, label: "UPDATE 203.0.113.0/24" },
      { t: 0.074, from: "transit", to: "isp", protocol: "BGP", info: "UPDATE — full table, 948,221 prefixes across 14,302 messages", size: "112 MB", kind: "response", step: 2, label: "FULL TABLE" },
      { t: 60.0, from: "isp", to: "transit", protocol: "BGP", info: "KEEPALIVE", size: "19 B", kind: "control", step: 3, label: "KEEPALIVE" },
      { t: 94.2, from: "transit", to: "isp", protocol: "BGP", info: "UPDATE — WITHDRAWN ROUTES: 203.0.113.0/24", size: "34 B", kind: "control", step: 4, label: "WITHDRAW" },
      { t: 94.6, from: "isp", to: "hosting", protocol: "BGP", info: "UPDATE — 203.0.113.0/24 re-advertised, AS_PATH 64500 64511", size: "92 B", kind: "response", step: 4, label: "REROUTE" },
    ],
  },

  {
    id: "ntp",
    name: "NTP",
    fullName: "Network Time Protocol",
    tagline: "Keeping clocks within milliseconds",
    category: "core",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "123",
    transport: "UDP",
    format: "48 byte packet with four timestamps",
    rfc: "RFC 5905",
    extra: [
      { label: "ACCURACY", value: "A few milliseconds over the internet" },
      { label: "STRATUM", value: "0 is a reference clock, 15 is unusable" },
    ],
    description:
      "Certificates expire, logs correlate and tokens time out — all of which need clocks that agree. NTP samples a server repeatedly, and from four timestamps per exchange works out both the network delay and the offset between the two clocks. Rather than jumping the clock it usually slews it, speeding it up or slowing it down until it matches.",
    nodes: nodes("client", ["router", { passive: true }], ["resolver", { x: 700, y: 275, label: "NTP Server", sublabel: "stratum 2" }], ["root", { x: 890, y: 110, label: "Reference Clock", sublabel: "stratum 1 · GPS" }]),
    links: links("client-router", "router-resolver", "resolver-root~"),
    steps: [
      {
        title: "Pick a server",
        summary: "Stratum describes distance from a real clock",
        detail:
          "A stratum 1 server is attached directly to a reference such as a GPS receiver or an atomic clock. A server synchronised to it is stratum 2, and so on. Clients usually query several servers from a pool so that one lying — or simply broken — can be outvoted.",
        facts: [
          { label: "THIS SERVER", value: "Stratum 2" },
          { label: "GOOD PRACTICE", value: "Query at least four sources" },
        ],
      },
      {
        title: "Four timestamps",
        summary: "T1 and T4 local, T2 and T3 remote",
        detail:
          "The client records when it sent the request (T1). The server records when it arrived (T2) and when it replied (T3). The client records when the reply landed (T4). Those four numbers travel in a single 48-byte packet and are everything the calculation needs.",
        facts: [
          { label: "PACKET", value: "48 bytes — mode 3 request, mode 4 reply" },
          { label: "EPOCH", value: "Seconds since 1 January 1900" },
        ],
      },
      {
        title: "Offset and delay",
        summary: "Two subtractions do the work",
        detail:
          "Round-trip delay is (T4 − T1) − (T3 − T2): the total elapsed time minus the time the server spent thinking. Offset is ((T2 − T1) + (T3 − T4)) ÷ 2, which assumes the path is symmetric. That assumption is the main source of error — an asymmetric route skews the result by half the difference.",
        facts: [
          { label: "DELAY", value: "(T4 − T1) − (T3 − T2)" },
          { label: "OFFSET", value: "((T2 − T1) + (T3 − T4)) ÷ 2" },
        ],
      },
      {
        title: "Slew, do not jump",
        summary: "Time should never run backwards",
        detail:
          "Several samples are filtered to discard outliers before anything is applied. Small offsets are corrected by adjusting the rate of the system clock until it catches up, because a clock that jumps backwards breaks file timestamps, databases and schedulers. Only an offset beyond roughly 128 ms is stepped outright.",
        facts: [
          { label: "SLEW LIMIT", value: "About 0.5 ms per second" },
          { label: "STEP THRESHOLD", value: "128 ms" },
        ],
      },
      {
        title: "Poll again",
        summary: "The interval adapts to stability",
        detail:
          "Polling starts around every 64 seconds and backs off towards 1024 seconds as the local clock proves well behaved. If the offset starts drifting, the interval tightens again. A well-disciplined machine on a stable network holds within a few milliseconds indefinitely.",
        facts: [
          { label: "RANGE", value: "64 to 1024 seconds" },
          { label: "DRIFT FILE", value: "Records the local oscillator's bias" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "resolver", protocol: "NTP", info: "Client mode 3, Transmit Timestamp T1 = 3,940,282,117.412", size: "90 B", kind: "request", step: 1, label: "SAMPLE 1 · T1" },
      { t: 0.014, from: "resolver", to: "client", protocol: "NTP", info: "Server mode 4, stratum 2, T2 and T3 filled in, ref 198.41.0.4", size: "90 B", kind: "response", step: 1, label: "T2, T3" },
      { t: 0.028, from: "client", to: "resolver", protocol: "NTP", info: "Client mode 3 (sample 2)", size: "90 B", kind: "request", step: 2, label: "SAMPLE 2" },
      { t: 0.042, from: "resolver", to: "client", protocol: "NTP", info: "Server mode 4 — delay 13.8 ms, offset +41.2 ms", size: "90 B", kind: "response", step: 2, label: "DELAY 13.8 ms" },
      { t: 0.056, from: "client", to: "resolver", protocol: "NTP", info: "Client mode 3 (sample 3)", size: "90 B", kind: "request", step: 2, label: "SAMPLE 3" },
      { t: 0.07, from: "resolver", to: "client", protocol: "NTP", info: "Server mode 4, root dispersion 7.6 ms — offset accepted", size: "90 B", kind: "response", step: 3, label: "OFFSET +41 ms" },
      { t: 64.0, from: "client", to: "resolver", protocol: "NTP", info: "Client mode 3, poll interval now 64 s", size: "90 B", kind: "request", step: 4, label: "POLL" },
      { t: 64.014, from: "resolver", to: "client", protocol: "NTP", info: "Server mode 4, offset now +0.8 ms — the clock is disciplined", size: "90 B", kind: "response", step: 4, label: "STEADY +0.8 ms" },
    ],
  },
];
