import type { Protocol } from "../types";
import { links, nodes } from "../topology";

export const applicationProtocols: Protocol[] = [
  {
    id: "http",
    name: "HTTP",
    fullName: "Hypertext Transfer Protocol",
    tagline: "The request and response of the web",
    category: "application",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "80 (443 for HTTPS)",
    transport: "TCP",
    format: "Text headers and an optional body",
    rfc: "RFC 9110, RFC 9112",
    extra: [
      { label: "METHODS", value: "GET, POST, PUT, DELETE, HEAD, PATCH" },
      { label: "STATE", value: "Stateless — cookies carry context" },
    ],
    description:
      "HTTP is the protocol of the web: a client asks for a resource, such as an HTML page, and the server answers with a status code, headers and usually a body. Every exchange is one request and one response, written as readable text in HTTP/1.1. The server remembers nothing between requests, so anything resembling a session is carried in cookies or tokens the client sends each time.",
    nodes: nodes("client", ["router", { passive: true }], "resolver", "web"),
    links: links("client-router", "router-resolver", "router-web", "router-internet~"),
    steps: [
      {
        title: "Client request",
        summary: "The browser prepares the request",
        detail:
          "You type a URL. The browser splits it into a scheme, a hostname and a path, checks its own cache for a fresh copy, and decides it needs to go to the network. Nothing has left the machine yet — but the request line, the Host header and the accepted content types are already assembled.",
        facts: [
          { label: "URL", value: "http://www.example.com/" },
          { label: "CACHE", value: "Checked first — a hit skips everything below" },
        ],
      },
      {
        title: "DNS resolution",
        summary: "Finding the server's IP address",
        detail:
          "The hostname means nothing to the network layer, so the browser asks a resolver to translate www.example.com into an address. The answer comes back as an A record with a time-to-live telling the client how long it may reuse it before asking again.",
        facts: [
          { label: "QUERY TYPE", value: "A (and AAAA for IPv6)" },
          { label: "ANSWER", value: "203.0.113.10" },
        ],
      },
      {
        title: "TCP connection",
        summary: "Establishing a reliable link",
        detail:
          "HTTP needs an ordered, lossless stream, so a TCP connection is opened to port 80 with the usual three-way handshake. This costs a full round trip before a single byte of the request can be sent — the reason HTTP/2 multiplexes many requests over one connection, and why HTTP/3 moved to QUIC.",
        facts: [
          { label: "PORT", value: "80" },
          { label: "COST", value: "One round trip of pure setup" },
        ],
      },
      {
        title: "HTTP exchange",
        summary: "Request and response messages",
        detail:
          "The request is plain text: a method, a path, a version, then headers, a blank line and an optional body. The response mirrors it with a status line and its own headers. Status codes carry the meaning — 200 succeeded, 301 moved, 404 is missing, 500 means the server broke.",
        facts: [
          { label: "STATUS", value: "200 OK" },
          { label: "CONTENT-TYPE", value: "text/html; charset=utf-8" },
        ],
      },
      {
        title: "Page rendering",
        summary: "The browser displays the content",
        detail:
          "The HTML arrives and parsing begins immediately, before the response has even finished. Each stylesheet, script and image referenced triggers another request, often reusing the same connection. Only once the critical resources are in can the page be painted.",
        facts: [
          { label: "SUB-RESOURCES", value: "CSS, JS and images fetched separately" },
          { label: "KEEP-ALIVE", value: "The connection is reused by default" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "resolver", protocol: "DNS", info: "Standard query A www.example.com", size: "75 B", kind: "dns", step: 1, label: "DNS QUERY", payload: "A? www.example.com" },
      { t: 0.012, from: "resolver", to: "client", protocol: "DNS", info: "Standard query response A 203.0.113.10", size: "91 B", kind: "dns", step: 1, label: "DNS REPLY", payload: "www.example.com  A  203.0.113.10  TTL 300" },
      { t: 0.024, from: "client", to: "web", protocol: "TCP", info: "52344 → 80 [SYN] Seq=0", size: "66 B", kind: "transport", step: 2, label: "SYN" },
      { t: 0.041, from: "web", to: "client", protocol: "TCP", info: "80 → 52344 [SYN, ACK] Seq=0 Ack=1", size: "66 B", kind: "transport", step: 2, label: "SYN-ACK" },
      { t: 0.058, from: "client", to: "web", protocol: "TCP", info: "52344 → 80 [ACK] Seq=1 Ack=1", size: "60 B", kind: "transport", step: 2, label: "ACK" },
      { t: 0.059, from: "client", to: "web", protocol: "HTTP", info: "GET / HTTP/1.1", size: "484 B", kind: "request", step: 3, label: "GET /", payload: "GET / HTTP/1.1  ·  Host: www.example.com  ·  Accept: text/html" },
      { t: 0.076, from: "web", to: "client", protocol: "HTTP", info: "HTTP/1.1 200 OK (text/html), 9 segments", size: "12.8 KB", kind: "response", step: 3, label: "200 OK", payload: "HTTP/1.1 200 OK  ·  Content-Type: text/html  ·  Content-Length: 13104" },
      { t: 0.092, from: "client", to: "web", protocol: "HTTP", info: "GET /assets/style.css HTTP/1.1", size: "402 B", kind: "request", step: 4, label: "GET /style.css" },
      { t: 0.108, from: "web", to: "client", protocol: "HTTP", info: "HTTP/1.1 200 OK (text/css)", size: "6.1 KB", kind: "response", step: 4, label: "200 OK · CSS" },
      { t: 0.121, from: "client", to: "web", protocol: "HTTP", info: "GET /assets/app.js HTTP/1.1", size: "398 B", kind: "request", step: 4, label: "GET /app.js" },
      { t: 0.149, from: "web", to: "client", protocol: "HTTP", info: "HTTP/1.1 200 OK (application/javascript)", size: "48.2 KB", kind: "response", step: 4, label: "200 OK · JS" },
    ],
  },

  {
    id: "dns",
    name: "DNS",
    fullName: "Domain Name System",
    tagline: "Turning names into addresses",
    category: "application",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "53",
    transport: "UDP, falling back to TCP",
    format: "Binary question and answer sections",
    rfc: "RFC 1034, RFC 1035",
    extra: [
      { label: "RECORD TYPES", value: "A, AAAA, CNAME, MX, TXT, NS, SOA" },
      { label: "CACHING", value: "Every answer carries a TTL" },
    ],
    description:
      "DNS is a distributed database that nobody owns in full. No single server knows every domain; instead a resolver walks down a hierarchy, asking the root which servers handle .com, asking those which handle example.com, and finally asking the authoritative server for the record itself. Answers are cached aggressively, so the full walk happens rarely.",
    nodes: nodes("client", ["router", { passive: true }], ["resolver", { x: 560, y: 255 }], "root", "tld", "authoritative"),
    links: links("client-router", "router-resolver", "resolver-root~", "resolver-tld~", "resolver-authoritative~"),
    steps: [
      {
        title: "Check the caches first",
        summary: "Most lookups never reach the network",
        detail:
          "The browser keeps its own small cache, the operating system keeps another, and the resolver keeps a much larger one. A popular domain is almost certainly already cached somewhere, and the whole hierarchy below is skipped entirely. Only a genuine miss travels further.",
        facts: [
          { label: "LAYERS", value: "Browser, OS stub, then the resolver" },
          { label: "HIT RATE", value: "Typically well above 80% at the resolver" },
        ],
      },
      {
        title: "Ask the resolver",
        summary: "One recursive question leaves the machine",
        detail:
          "The client sends a single query with the recursion-desired flag set, meaning it wants a final answer and not a referral. The resolver — your ISP's, or a public one like 8.8.8.8 or 1.1.1.1 — takes on all of the work from here. This is the only query the client itself ever sends.",
        facts: [
          { label: "FLAG", value: "RD — recursion desired" },
          { label: "TRANSPORT", value: "UDP port 53, one datagram each way" },
        ],
      },
      {
        title: "Walk the hierarchy",
        summary: "Root, then TLD, then authoritative",
        detail:
          "The resolver asks one of the thirteen root server addresses, which does not know the answer but knows who runs .com. Those servers in turn point at the nameservers for example.com. Each step is a referral rather than an answer, narrowing the search by one label at a time.",
        facts: [
          { label: "ROOT SERVERS", value: "13 addresses, hundreds of anycast instances" },
          { label: "EACH STEP", value: "A referral, not an answer" },
        ],
      },
      {
        title: "Answer and cache",
        summary: "The record comes back with a TTL",
        detail:
          "The authoritative server finally returns the A record. The resolver caches it for the duration of its TTL and passes it to the client, which caches it too. The next person asking the same resolver for the same name gets an answer in under a millisecond without any of this happening again.",
        facts: [
          { label: "ANSWER", value: "203.0.113.10" },
          { label: "TTL", value: "300 seconds" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "resolver", protocol: "DNS", info: "Standard query A www.example.com, RD set", size: "75 B", kind: "dns", step: 1, label: "A? www.example.com", payload: "Flags: RD  ·  Questions: 1  ·  Answers: 0" },
      { t: 0.004, from: "resolver", to: "root", protocol: "DNS", info: "Standard query A www.example.com (no recursion)", size: "75 B", kind: "dns", step: 2, label: "ASK ROOT" },
      { t: 0.021, from: "root", to: "resolver", protocol: "DNS", info: "Referral — 13 NS records for .com, plus glue", size: "512 B", kind: "dns", step: 2, label: "REFERRAL → .com" },
      { t: 0.024, from: "resolver", to: "tld", protocol: "DNS", info: "Standard query A www.example.com", size: "75 B", kind: "dns", step: 2, label: "ASK .com" },
      { t: 0.043, from: "tld", to: "resolver", protocol: "DNS", info: "Referral — ns1.example.com, ns2.example.com", size: "289 B", kind: "dns", step: 2, label: "REFERRAL → ns1" },
      { t: 0.046, from: "resolver", to: "authoritative", protocol: "DNS", info: "Standard query A www.example.com", size: "75 B", kind: "dns", step: 2, label: "ASK AUTHORITATIVE" },
      { t: 0.062, from: "authoritative", to: "resolver", protocol: "DNS", info: "Authoritative answer A 203.0.113.10, TTL 300, AA set", size: "91 B", kind: "dns", step: 3, label: "A 203.0.113.10" },
      { t: 0.066, from: "resolver", to: "client", protocol: "DNS", info: "Standard query response A 203.0.113.10 (cached for 300s)", size: "91 B", kind: "dns", step: 3, label: "ANSWER", payload: "www.example.com  A  203.0.113.10  TTL 300" },
    ],
  },

  {
    id: "websocket",
    name: "WebSocket",
    fullName: "The WebSocket Protocol",
    tagline: "Two-way messaging over one connection",
    category: "application",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "80 and 443 (ws:// and wss://)",
    transport: "TCP, starting life as HTTP",
    format: "Binary frames with a 2-14 byte header",
    rfc: "RFC 6455",
    extra: [
      { label: "DIRECTION", value: "Full duplex — either side may send" },
      { label: "OVERHEAD", value: "As little as 2 bytes per message" },
    ],
    description:
      "HTTP only lets the client ask and the server answer, which is awkward when the server has news to deliver. WebSocket solves it by starting as an ordinary HTTP request that asks to upgrade. Once the server agrees with a 101, the same TCP connection stops speaking HTTP and becomes a bidirectional channel of lightweight frames that stays open for as long as both sides want it.",
    nodes: nodes("client", ["router", { passive: true }], ["web", { y: 255, label: "WebSocket Server", sublabel: "203.0.113.10" }]),
    links: links("client-router", "router-web"),
    steps: [
      {
        title: "The HTTP handshake",
        summary: "An ordinary request asking to upgrade",
        detail:
          "The connection opens as plain HTTP so it passes through proxies, firewalls and load balancers that only understand the web. The request carries Upgrade: websocket, Connection: Upgrade and a random Sec-WebSocket-Key — a nonce that proves the server genuinely understood the handshake rather than replying by accident.",
        facts: [
          { label: "UPGRADE", value: "websocket" },
          { label: "KEY", value: "16 random bytes, base64 encoded" },
        ],
      },
      {
        title: "Switching protocols",
        summary: "101, and HTTP is finished",
        detail:
          "The server hashes the client's key with a fixed GUID and returns it in Sec-WebSocket-Accept, then answers 101 Switching Protocols. From this moment nothing on the connection is HTTP any more: the same socket now carries WebSocket frames in both directions, with no further request-response structure.",
        facts: [
          { label: "STATUS", value: "101 Switching Protocols" },
          { label: "AFTER THIS", value: "No more HTTP semantics on this socket" },
        ],
      },
      {
        title: "Frames both ways",
        summary: "Either side sends whenever it likes",
        detail:
          "Messages travel as frames with a tiny header carrying an opcode, a length and a FIN bit for fragmentation. Client-to-server frames must be masked with a random key — not for secrecy, but to stop a malicious page from crafting bytes that a confused intermediary would mistake for an HTTP request. Ping and pong frames keep idle connections from being reaped.",
        facts: [
          { label: "OPCODES", value: "Text, binary, close, ping, pong" },
          { label: "MASKING", value: "Mandatory client to server" },
        ],
      },
      {
        title: "Closing",
        summary: "A close frame, then the TCP FIN",
        detail:
          "Either side may send a close frame carrying a status code and an optional reason. The other echoes it back, and only then is the TCP connection torn down. The handshake matters: it distinguishes a deliberate close from a dropped network, which is what tells a client whether to reconnect.",
        facts: [
          { label: "STATUS 1000", value: "Normal closure" },
          { label: "STATUS 1006", value: "Abnormal — no close frame was seen" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "web", protocol: "HTTP", info: "GET /chat HTTP/1.1, Upgrade: websocket", size: "312 B", kind: "request", step: 0, label: "UPGRADE REQUEST", payload: "Upgrade: websocket  ·  Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" },
      { t: 0.034, from: "web", to: "client", protocol: "HTTP", info: "HTTP/1.1 101 Switching Protocols", size: "198 B", kind: "response", step: 1, label: "101 SWITCHING", payload: "Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=" },
      { t: 0.051, from: "client", to: "web", protocol: "WebSocket", info: "Text frame, FIN, MASKED, payload 18 bytes", size: "24 B", kind: "request", step: 2, label: "TEXT → hello", payload: '{"type":"join","room":"general"}' },
      { t: 0.069, from: "web", to: "client", protocol: "WebSocket", info: "Text frame, FIN, payload 26 bytes", size: "32 B", kind: "response", step: 2, label: "TEXT ← welcome" },
      { t: 0.51, from: "web", to: "client", protocol: "WebSocket", info: "Ping frame — keeping the connection alive", size: "6 B", kind: "control", step: 2, label: "PING" },
      { t: 0.512, from: "client", to: "web", protocol: "WebSocket", info: "Pong frame, MASKED", size: "10 B", kind: "control", step: 2, label: "PONG" },
      { t: 0.84, from: "web", to: "client", protocol: "WebSocket", info: "Text frame, FIN, server-initiated push", size: "96 B", kind: "response", step: 2, label: "SERVER PUSH" },
      { t: 1.204, from: "client", to: "web", protocol: "WebSocket", info: "Close frame, status 1000 (normal closure)", size: "10 B", kind: "control", step: 3, label: "CLOSE 1000" },
      { t: 1.221, from: "web", to: "client", protocol: "TCP", info: "443 → 52344 [FIN, ACK] — socket torn down", size: "60 B", kind: "transport", step: 3, label: "FIN" },
    ],
  },

  {
    id: "quic",
    name: "QUIC",
    fullName: "QUIC and HTTP/3",
    tagline: "Encrypted, multiplexed transport over UDP",
    category: "application",
    layer: 4,
    layerName: "Transport (Layer 4)",
    port: "443 over UDP",
    transport: "UDP",
    format: "Encrypted packets carrying frames",
    rfc: "RFC 9000, RFC 9114",
    extra: [
      { label: "HANDSHAKE", value: "One round trip, or zero on resumption" },
      { label: "MIGRATION", value: "Survives a change of IP address" },
    ],
    description:
      "QUIC rebuilds TCP's reliability inside UDP and folds the TLS handshake into it, so a connection is established and encrypted in a single round trip. Because it carries many independent streams, a lost packet stalls only the stream it belonged to rather than everything behind it. And because connections are identified by a connection ID rather than an address pair, moving from Wi-Fi to mobile data does not break them.",
    nodes: nodes("client", ["router", { passive: true }], ["web", { y: 255, label: "HTTP/3 Server", sublabel: "203.0.113.10" }]),
    links: links("client-router", "router-web"),
    steps: [
      {
        title: "The initial packet",
        summary: "ClientHello in the very first datagram",
        detail:
          "There is no separate transport handshake to wait for. The first UDP datagram already carries a TLS ClientHello along with the client's chosen connection ID and its transport parameters. Even this initial packet is partly encrypted, using keys derived from the connection ID itself.",
        facts: [
          { label: "PACKET TYPE", value: "Initial, long header" },
          { label: "PADDED TO", value: "1200 bytes, to resist amplification attacks" },
        ],
      },
      {
        title: "Handshake",
        summary: "Keys agreed in one round trip",
        detail:
          "The server answers with its ServerHello, encrypted extensions and certificate chain, and both sides derive handshake keys. Compare this with HTTPS over TCP: there, a TCP handshake and a TLS handshake run one after the other, costing two or three round trips before any request can be sent.",
        facts: [
          { label: "COST", value: "1 RTT — or 0 RTT when resuming" },
          { label: "REPLACES", value: "TCP handshake plus TLS handshake" },
        ],
      },
      {
        title: "Connection established",
        summary: "Application data in 1-RTT packets",
        detail:
          "Once both sides send Finished, the connection switches to short-header 1-RTT packets. Almost everything is encrypted, including the acknowledgements and the frame types — middleboxes can see very little, which is deliberate, and is why QUIC avoided the ossification that froze TCP's design in place.",
        facts: [
          { label: "VISIBLE", value: "Little more than the connection ID" },
          { label: "RESUMPTION", value: "A ticket enables 0-RTT next time" },
        ],
      },
      {
        title: "Independent streams",
        summary: "One loss does not stall the rest",
        detail:
          "HTTP/3 maps each request and response onto its own QUIC stream. A dropped packet holds up only the stream whose bytes went missing; the others continue delivering. HTTP/2 could multiplex too, but sat on a single TCP stream, so a single loss blocked every request at once — the head-of-line blocking QUIC exists to remove.",
        facts: [
          { label: "STREAM IDS", value: "Client-initiated bidirectional: 0, 4, 8…" },
          { label: "FIXES", value: "Transport-level head-of-line blocking" },
        ],
      },
      {
        title: "Connection migration",
        summary: "Change networks without reconnecting",
        detail:
          "Walking out of Wi-Fi range gives the device a new IP address. A TCP connection would die, because it is identified by the four-tuple of addresses and ports. QUIC is identified by its connection ID, so the client simply validates the new path with a challenge and carries on — the download never pauses.",
        facts: [
          { label: "IDENTIFIED BY", value: "Connection ID, not the address pair" },
          { label: "VALIDATION", value: "PATH_CHALLENGE and PATH_RESPONSE" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "web", protocol: "QUIC", info: "Initial — CRYPTO ClientHello, DCID=0x8f2a41c7, padded to 1200 B", size: "1.2 KB", kind: "secure", step: 0, label: "INITIAL + CLIENTHELLO" },
      { t: 0.021, from: "web", to: "client", protocol: "QUIC", info: "Initial + Handshake — ServerHello, EncryptedExtensions, Certificate", size: "3.1 KB", kind: "secure", step: 1, label: "SERVERHELLO + CERT" },
      { t: 0.042, from: "client", to: "web", protocol: "QUIC", info: "Handshake — FINISHED, handshake keys confirmed", size: "92 B", kind: "secure", step: 1, label: "FINISHED" },
      { t: 0.043, from: "client", to: "web", protocol: "HTTP/3", info: "1-RTT, STREAM 0 — HEADERS GET /", size: "128 B", kind: "request", step: 2, label: "GET / (stream 0)" },
      { t: 0.064, from: "web", to: "client", protocol: "HTTP/3", info: "1-RTT, STREAM 0 — HEADERS 200, DATA", size: "14.2 KB", kind: "response", step: 3, label: "200 OK (stream 0)" },
      { t: 0.066, from: "web", to: "client", protocol: "HTTP/3", info: "1-RTT, STREAM 4 — DATA (app.js)", size: "48.0 KB", kind: "response", step: 3, label: "STREAM 4 · app.js" },
      { t: 0.068, from: "web", to: "client", protocol: "HTTP/3", info: "1-RTT, STREAM 8 — DATA (style.css), unaffected by loss on stream 4", size: "7.4 KB", kind: "response", step: 3, label: "STREAM 8 · style.css" },
      { t: 2.3, from: "client", to: "web", protocol: "QUIC", info: "1-RTT, PATH_CHALLENGE — client moved to a new address", size: "64 B", kind: "control", step: 4, label: "PATH_CHALLENGE" },
      { t: 2.318, from: "web", to: "client", protocol: "QUIC", info: "1-RTT, PATH_RESPONSE — migration accepted", size: "64 B", kind: "control", step: 4, label: "PATH_RESPONSE" },
    ],
  },

  {
    id: "smtp",
    name: "SMTP",
    fullName: "Simple Mail Transfer Protocol",
    tagline: "How mail is handed between servers",
    category: "application",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "25, 465 and 587",
    transport: "TCP",
    format: "Text commands and numeric replies",
    rfc: "RFC 5321",
    extra: [
      { label: "SUBMISSION", value: "587 with STARTTLS, or 465 implicit TLS" },
      { label: "DIRECTION", value: "Sending only — never for reading mail" },
    ],
    description:
      "SMTP is a conversation in plain text: the client issues a command, the server answers with a three-digit code, and the pattern repeats. Its oldest and strangest feature is that the envelope — who the message is really from and really going to — is entirely separate from the From and To headers inside the message, which is why forging the visible sender was trivial for decades.",
    nodes: nodes("client", ["router", { passive: true }], ["mail", { x: 700, y: 255, label: "Mail Server", sublabel: "smtp.example.com" }]),
    links: links("client-router", "router-mail"),
    steps: [
      {
        title: "Connect and greet",
        summary: "The server speaks first",
        detail:
          "Unusually, the server opens the conversation. As soon as the TCP connection is up it sends a 220 banner naming itself and announcing it is ready. The client must wait for this before saying anything — sending early is a classic spammer tell that many servers check for.",
        facts: [
          { label: "CODE 220", value: "Service ready" },
          { label: "PORT", value: "587 for submission from a mail client" },
        ],
      },
      {
        title: "EHLO and STARTTLS",
        summary: "Capabilities, then encryption",
        detail:
          "The client introduces itself with EHLO, and the server lists what it supports: message size limits, authentication mechanisms, pipelining, STARTTLS. The client then issues STARTTLS, and the plaintext session is upgraded in place — everything after this point, including the password, is encrypted.",
        facts: [
          { label: "CODE 250", value: "Requested action completed" },
          { label: "UPGRADE", value: "STARTTLS encrypts the existing connection" },
        ],
      },
      {
        title: "The envelope",
        summary: "MAIL FROM and RCPT TO",
        detail:
          "MAIL FROM sets the return path — where bounces go — and each RCPT TO names one recipient. These addresses are what actually determine delivery. The From: and To: headers inside the message are merely text for display, which is exactly why SPF, DKIM and DMARC had to be invented on top.",
        facts: [
          { label: "ENVELOPE", value: "Routes the mail" },
          { label: "HEADERS", value: "Only what the reader is shown" },
        ],
      },
      {
        title: "DATA",
        summary: "Headers, a blank line, the body",
        detail:
          "The client sends DATA, the server answers 354, and the message follows. A single full stop on a line of its own ends it — so any line in the body that genuinely starts with a stop is doubled in transit and undoubled on receipt. The 250 that follows means the server has accepted responsibility for the message.",
        facts: [
          { label: "TERMINATOR", value: "A lone . on its own line" },
          { label: "CODE 354", value: "Start mail input" },
        ],
      },
      {
        title: "QUIT",
        summary: "A polite goodbye",
        detail:
          "QUIT draws a 221 and the connection closes. A client with several messages can instead loop back to MAIL FROM and reuse the session, which is how bulk senders avoid repeating the handshake for every recipient.",
        facts: [
          { label: "CODE 221", value: "Closing transmission channel" },
          { label: "REUSE", value: "Many messages may share one session" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "mail", to: "client", protocol: "SMTP", info: "220 smtp.example.com ESMTP ready", size: "78 B", kind: "response", step: 0, label: "220 READY" },
      { t: 0.018, from: "client", to: "mail", protocol: "SMTP", info: "EHLO laptop.local", size: "23 B", kind: "request", step: 1, label: "EHLO" },
      { t: 0.032, from: "mail", to: "client", protocol: "SMTP", info: "250-STARTTLS, 250-AUTH LOGIN PLAIN, 250-SIZE 35882577, 250 PIPELINING", size: "142 B", kind: "response", step: 1, label: "250 CAPABILITIES" },
      { t: 0.048, from: "client", to: "mail", protocol: "SMTP", info: "STARTTLS", size: "10 B", kind: "request", step: 1, label: "STARTTLS" },
      { t: 0.061, from: "mail", to: "client", protocol: "SMTP", info: "220 2.0.0 Ready to start TLS", size: "32 B", kind: "secure", step: 1, label: "220 TLS READY" },
      { t: 0.14, from: "client", to: "mail", protocol: "SMTP", info: "MAIL FROM:<me@example.com> (encrypted)", size: "32 B", kind: "request", step: 2, label: "MAIL FROM" },
      { t: 0.156, from: "mail", to: "client", protocol: "SMTP", info: "250 2.1.0 Sender OK", size: "26 B", kind: "response", step: 2, label: "250 OK" },
      { t: 0.17, from: "client", to: "mail", protocol: "SMTP", info: "RCPT TO:<you@example.net>", size: "31 B", kind: "request", step: 2, label: "RCPT TO" },
      { t: 0.186, from: "mail", to: "client", protocol: "SMTP", info: "250 2.1.5 Recipient OK", size: "28 B", kind: "response", step: 2, label: "250 OK" },
      { t: 0.2, from: "client", to: "mail", protocol: "SMTP", info: "DATA", size: "6 B", kind: "request", step: 3, label: "DATA" },
      { t: 0.214, from: "mail", to: "client", protocol: "SMTP", info: "354 End data with <CR><LF>.<CR><LF>", size: "38 B", kind: "response", step: 3, label: "354 GO AHEAD" },
      { t: 0.23, from: "client", to: "mail", protocol: "SMTP", info: "Message headers and body, 4.2 KB, terminated by a lone full stop", size: "4.3 KB", kind: "request", step: 3, label: "MESSAGE", payload: "From: me@example.com  ·  Subject: Lunch?  ·  Date: Wed, 19 Nov 2025" },
      { t: 0.268, from: "mail", to: "client", protocol: "SMTP", info: "250 2.0.0 OK: queued as 8A21C3F9B", size: "40 B", kind: "response", step: 3, label: "250 QUEUED" },
      { t: 0.28, from: "client", to: "mail", protocol: "SMTP", info: "QUIT", size: "6 B", kind: "request", step: 4, label: "QUIT" },
      { t: 0.292, from: "mail", to: "client", protocol: "SMTP", info: "221 2.0.0 Bye", size: "19 B", kind: "response", step: 4, label: "221 BYE" },
    ],
  },

  {
    id: "imap",
    name: "IMAP",
    fullName: "Internet Message Access Protocol",
    tagline: "Reading mail that stays on the server",
    category: "application",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "993 (implicit TLS), 143",
    transport: "TCP",
    format: "Tagged text commands and responses",
    rfc: "RFC 9051",
    extra: [
      { label: "MODEL", value: "The server holds the mailbox of record" },
      { label: "VERSUS POP3", value: "POP3 downloads and usually deletes" },
    ],
    description:
      "IMAP treats the server as the single source of truth. Messages, folders and read or unread flags all live there, so every device shows the same mailbox. Clients fetch only what they need — headers for a list, a body when you open something — and IDLE lets the server push a notification the instant new mail arrives.",
    nodes: nodes("client", ["router", { passive: true }], ["mail", { x: 700, y: 255, label: "IMAP Server", sublabel: "imap.example.com" }]),
    links: links("client-router", "router-mail"),
    steps: [
      {
        title: "Connect over TLS",
        summary: "Encrypted before a word is spoken",
        detail:
          "Modern clients connect to port 993, where TLS is established before any IMAP at all. The server then sends an untagged OK listing its capabilities. The older pattern — plaintext on 143, upgraded with STARTTLS — still exists but is discouraged, because a network attacker can strip the upgrade.",
        facts: [
          { label: "PORT 993", value: "Implicit TLS, preferred" },
          { label: "UNTAGGED", value: "Lines starting with * are server-initiated" },
        ],
      },
      {
        title: "Log in",
        summary: "Every command carries a tag",
        detail:
          "The client prefixes each command with a unique tag such as a001. The server's final response for that command repeats the tag, which is how several commands can be in flight at once without the replies becoming ambiguous. Untagged lines in between are data belonging to the command.",
        facts: [
          { label: "TAGGING", value: "a001, a002, a003 — client's own counter" },
          { label: "AUTH", value: "LOGIN, or SASL mechanisms such as OAUTHBEARER" },
        ],
      },
      {
        title: "Select a mailbox",
        summary: "Opening INBOX reveals its state",
        detail:
          "SELECT makes a folder current and the server immediately reports how many messages exist, how many are recent, which flags are permitted and the UIDVALIDITY value. If UIDVALIDITY has changed since last time, every cached message identifier is stale and the client must resynchronise from scratch.",
        facts: [
          { label: "EXISTS", value: "1842 messages" },
          { label: "UIDVALIDITY", value: "Invalidates the client's cache when it changes" },
        ],
      },
      {
        title: "Fetch what you need",
        summary: "Headers now, bodies on demand",
        detail:
          "FETCH takes a message range and a list of parts. A client drawing a message list asks only for flags and envelopes; opening a message fetches BODY[1]; an attachment is fetched separately and only if you click it. This partial fetching is why IMAP works over a slow connection where downloading everything would not.",
        facts: [
          { label: "ENVELOPE", value: "From, To, Subject, Date, Message-ID" },
          { label: "PARTIAL", value: "BODY[1] fetches one MIME part alone" },
        ],
      },
      {
        title: "IDLE for new mail",
        summary: "The server speaks when something changes",
        detail:
          "Without IDLE a client must poll, trading battery life against how stale the inbox looks. With it, the client says IDLE and simply waits; the server sends an untagged EXISTS the moment a message arrives. The client must renew roughly every 29 minutes so intermediaries do not drop the idle connection.",
        facts: [
          { label: "RENEW", value: "At least every 29 minutes" },
          { label: "PUSH", value: "* 1843 EXISTS arrives unprompted" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "mail", to: "client", protocol: "IMAP", info: "* OK [CAPABILITY IMAP4rev2 IDLE MOVE] Server ready", size: "64 B", kind: "response", step: 0, label: "* OK READY" },
      { t: 0.021, from: "client", to: "mail", protocol: "IMAP", info: "a001 LOGIN me@example.com ****", size: "44 B", kind: "request", step: 1, label: "a001 LOGIN" },
      { t: 0.048, from: "mail", to: "client", protocol: "IMAP", info: "a001 OK LOGIN completed", size: "28 B", kind: "response", step: 1, label: "a001 OK" },
      { t: 0.06, from: "client", to: "mail", protocol: "IMAP", info: "a002 SELECT INBOX", size: "21 B", kind: "request", step: 2, label: "a002 SELECT INBOX" },
      { t: 0.082, from: "mail", to: "client", protocol: "IMAP", info: "* 1842 EXISTS, * 3 RECENT, * OK [UIDVALIDITY 1257842410], a002 OK", size: "118 B", kind: "response", step: 2, label: "1842 EXISTS" },
      { t: 0.094, from: "client", to: "mail", protocol: "IMAP", info: "a003 FETCH 1840:1842 (FLAGS ENVELOPE BODYSTRUCTURE)", size: "52 B", kind: "request", step: 3, label: "a003 FETCH 1840:1842" },
      { t: 0.131, from: "mail", to: "client", protocol: "IMAP", info: "* 3 FETCH responses with envelopes, a003 OK", size: "2.4 KB", kind: "response", step: 3, label: "ENVELOPES" },
      { t: 0.148, from: "client", to: "mail", protocol: "IMAP", info: "a004 FETCH 1842 BODY[1] — user opened the message", size: "38 B", kind: "request", step: 3, label: "a004 FETCH BODY[1]" },
      { t: 0.182, from: "mail", to: "client", protocol: "IMAP", info: "* 1842 FETCH (BODY[1] {4218}), a004 OK", size: "4.2 KB", kind: "response", step: 3, label: "MESSAGE BODY" },
      { t: 0.2, from: "client", to: "mail", protocol: "IMAP", info: "a005 IDLE", size: "15 B", kind: "request", step: 4, label: "a005 IDLE" },
      { t: 0.213, from: "mail", to: "client", protocol: "IMAP", info: "+ idling", size: "12 B", kind: "control", step: 4, label: "+ IDLING" },
      { t: 6.42, from: "mail", to: "client", protocol: "IMAP", info: "* 1843 EXISTS — new mail pushed without a request", size: "19 B", kind: "response", step: 4, label: "NEW MAIL" },
    ],
  },

  {
    id: "ftp",
    name: "FTP",
    fullName: "File Transfer Protocol",
    tagline: "Two connections, one transfer",
    category: "application",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "21 control, 20 or ephemeral data",
    transport: "TCP",
    format: "Text commands with numeric replies",
    rfc: "RFC 959",
    extra: [
      { label: "ODDITY", value: "Commands and data use separate connections" },
      { label: "TODAY", value: "Largely replaced by SFTP and HTTPS" },
    ],
    description:
      "FTP predates almost everything else still in use, and it shows. Commands travel on one connection while file contents travel on a second, opened fresh for each transfer. That split is what makes FTP so awkward for firewalls, and the reason passive mode exists. The original protocol also sends passwords in the clear, which is why SFTP and HTTPS have replaced it nearly everywhere.",
    nodes: nodes("client", ["router", { passive: true }], ["file", { x: 700, y: 255, label: "FTP Server", sublabel: "198.51.100.21" }]),
    links: links("client-router", "router-file"),
    steps: [
      {
        title: "The control connection",
        summary: "Port 21, and it stays open throughout",
        detail:
          "The client opens TCP to port 21 and the server greets it with 220. This connection carries only commands and replies, never file contents, and it remains open for the whole session — including while a transfer is running on the other connection, so a transfer can be aborted mid-flight.",
        facts: [
          { label: "PORT", value: "21" },
          { label: "CARRIES", value: "Commands and replies only" },
        ],
      },
      {
        title: "Log in",
        summary: "USER then PASS, historically in the clear",
        detail:
          "Authentication is two commands. The server answers 331 to acknowledge the username and ask for the password, then 230 on success. In plain FTP both travel unencrypted — trivially readable by anyone on the path. FTPS adds TLS; SFTP is a different protocol entirely, tunnelled inside SSH.",
        facts: [
          { label: "CODE 331", value: "Username OK, password needed" },
          { label: "CODE 230", value: "User logged in" },
        ],
      },
      {
        title: "Passive mode",
        summary: "Letting the client open the data link",
        detail:
          "Originally the server connected back to the client for data, which every NAT and firewall now blocks. PASV inverts it: the server opens a listening port and tells the client where to connect. The reply encodes the address and port as six comma-separated numbers, where the port is the fifth times 256 plus the sixth.",
        facts: [
          { label: "REPLY", value: "227 (198,51,100,21,195,80) → port 50000" },
          { label: "WHY", value: "Outbound connections pass through NAT" },
        ],
      },
      {
        title: "Transfer",
        summary: "The file moves on the second connection",
        detail:
          "RETR names the file. The server answers 150 to say the data connection is opening, streams the bytes across it, closes that connection and then sends 226 on the control channel to confirm completion. Closing the data connection is how the client knows the file has ended — there is no length field.",
        facts: [
          { label: "CODE 150", value: "Opening data connection" },
          { label: "CODE 226", value: "Transfer complete" },
        ],
      },
      {
        title: "Close",
        summary: "QUIT ends the session",
        detail:
          "The control connection closes with QUIT and a 221. More transfers could have reused the session, each opening a fresh data connection — a new PASV and a new port every time, which is precisely why stateful firewalls need a protocol helper to track FTP at all.",
        facts: [
          { label: "CODE 221", value: "Service closing control connection" },
          { label: "PER TRANSFER", value: "A brand new data connection each time" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "file", to: "client", protocol: "FTP", info: "220 Service ready for new user", size: "35 B", kind: "response", step: 0, label: "220 READY" },
      { t: 0.016, from: "client", to: "file", protocol: "FTP", info: "USER anonymous", size: "20 B", kind: "request", step: 1, label: "USER" },
      { t: 0.03, from: "file", to: "client", protocol: "FTP", info: "331 Password required for anonymous", size: "41 B", kind: "response", step: 1, label: "331 NEED PASSWORD" },
      { t: 0.044, from: "client", to: "file", protocol: "FTP", info: "PASS guest@example.com — sent in cleartext", size: "28 B", kind: "request", step: 1, label: "PASS (cleartext)" },
      { t: 0.061, from: "file", to: "client", protocol: "FTP", info: "230 User logged in, proceed", size: "33 B", kind: "response", step: 1, label: "230 LOGGED IN" },
      { t: 0.075, from: "client", to: "file", protocol: "FTP", info: "PASV", size: "6 B", kind: "request", step: 2, label: "PASV" },
      { t: 0.089, from: "file", to: "client", protocol: "FTP", info: "227 Entering Passive Mode (198,51,100,21,195,80)", size: "54 B", kind: "response", step: 2, label: "227 → port 50000" },
      { t: 0.103, from: "client", to: "file", protocol: "TCP", info: "52901 → 50000 [SYN] — opening the data connection", size: "66 B", kind: "transport", step: 2, label: "DATA SYN" },
      { t: 0.118, from: "client", to: "file", protocol: "FTP", info: "RETR annual-report.pdf", size: "28 B", kind: "request", step: 3, label: "RETR" },
      { t: 0.132, from: "file", to: "client", protocol: "FTP", info: "150 Opening BINARY mode data connection (1,943,208 bytes)", size: "62 B", kind: "response", step: 3, label: "150 OPENING" },
      { t: 0.146, from: "file", to: "client", protocol: "FTP-DATA", info: "File contents streamed on the data connection", size: "1.9 MB", kind: "media", step: 3, label: "FILE DATA" },
      { t: 1.88, from: "file", to: "client", protocol: "FTP", info: "226 Transfer complete — data connection closed", size: "32 B", kind: "response", step: 3, label: "226 COMPLETE" },
      { t: 1.894, from: "client", to: "file", protocol: "FTP", info: "QUIT", size: "6 B", kind: "request", step: 4, label: "QUIT" },
      { t: 1.906, from: "file", to: "client", protocol: "FTP", info: "221 Goodbye", size: "17 B", kind: "response", step: 4, label: "221 GOODBYE" },
    ],
  },

  {
    id: "webrtc",
    name: "WebRTC",
    fullName: "Web Real-Time Communication",
    tagline: "Browser-to-browser audio and video",
    category: "application",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "Negotiated, UDP wherever possible",
    transport: "UDP with DTLS and SRTP",
    format: "SDP for setup, RTP for media",
    rfc: "RFC 8825, RFC 8445",
    extra: [
      { label: "GOAL", value: "Media goes peer to peer, not via a server" },
      { label: "FALLBACK", value: "A TURN relay when NAT blocks the direct path" },
    ],
    description:
      "WebRTC gets audio and video directly between two browsers, which is hard because both are usually behind NAT with no reachable address. ICE solves it by gathering every candidate address each peer might be reachable on, then testing every pair until one works. Media is always encrypted, and the connection falls back to a relay only when nothing else succeeds.",
    nodes: nodes(
      "client",
      ["router", { passive: true }],
      ["app", { x: 640, y: 110, label: "Signalling Server", sublabel: "wss://signal.example" }],
      ["gateway", { x: 640, y: 420, label: "STUN / TURN", sublabel: "stun.example.com" }],
      ["peer", { x: 890, y: 255 }],
    ),
    links: links("client-router", "router-app", "router-gateway", "router-peer~"),
    steps: [
      {
        title: "Signalling",
        summary: "WebRTC does not define this part",
        detail:
          "The two peers must exchange session descriptions before they can connect, and the specification deliberately leaves how to a developer. In practice it is a WebSocket to a server both peers already trust. The offer and answer are SDP blobs listing supported codecs, encryption fingerprints and the media the caller wants to send.",
        facts: [
          { label: "FORMAT", value: "SDP offer and answer" },
          { label: "CHANNEL", value: "Anything — usually a WebSocket" },
        ],
      },
      {
        title: "Gathering candidates",
        summary: "Every address you might be reachable on",
        detail:
          "Each peer collects a host candidate for its local address, a server-reflexive candidate learned by asking a STUN server what the outside world sees, and a relayed candidate allocated on a TURN server as a last resort. All of these are sent to the other side as they are discovered.",
        facts: [
          { label: "HOST", value: "The local LAN address" },
          { label: "SRFLX", value: "The public address a STUN server reports back" },
        ],
      },
      {
        title: "Connectivity checks",
        summary: "Try every pair, keep the best",
        detail:
          "ICE pairs each local candidate with each remote one and sends STUN binding requests across all of them at once. Sending from both ends simultaneously punches holes through both NATs, which is what lets two devices with no public address reach each other directly. The highest-priority pair that answers wins.",
        facts: [
          { label: "MECHANISM", value: "Simultaneous send opens both NATs" },
          { label: "PREFERENCE", value: "Direct beats reflexive beats relayed" },
        ],
      },
      {
        title: "Securing the path",
        summary: "DTLS handshake, then SRTP keys",
        detail:
          "Once a path works the peers run a DTLS handshake over it and check the certificate fingerprints against those carried in the SDP — so the signalling server, which saw everything, still cannot impersonate either side. The keys derived from that handshake protect the media as SRTP. Encryption is not optional in WebRTC.",
        facts: [
          { label: "VERIFIES", value: "Fingerprints from the SDP" },
          { label: "MEDIA", value: "SRTP — always encrypted" },
        ],
      },
      {
        title: "Media flows",
        summary: "RTP packets, and RTCP reporting back",
        detail:
          "Audio and video stream as RTP over UDP, typically twenty milliseconds of audio per packet. RTCP carries statistics in the other direction — jitter, loss, round-trip time — and the sender adapts its bitrate and resolution to match. Lost packets are concealed rather than retransmitted, because a late frame is worth nothing.",
        facts: [
          { label: "AUDIO", value: "Opus, ~20 ms per packet" },
          { label: "ADAPTS", value: "Bitrate follows the RTCP reports" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "app", protocol: "WSS", info: "SDP offer — codecs, DTLS fingerprint, media directions", size: "2.8 KB", kind: "request", step: 0, label: "SDP OFFER" },
      { t: 0.042, from: "app", to: "client", protocol: "WSS", info: "SDP answer from the remote peer", size: "2.6 KB", kind: "response", step: 0, label: "SDP ANSWER" },
      { t: 0.061, from: "client", to: "gateway", protocol: "STUN", info: "Binding request — what is my public address?", size: "92 B", kind: "control", step: 1, label: "STUN BINDING" },
      { t: 0.084, from: "gateway", to: "client", protocol: "STUN", info: "Binding success — XOR-MAPPED-ADDRESS 198.51.100.7:54321", size: "108 B", kind: "control", step: 1, label: "SRFLX 198.51.100.7" },
      { t: 0.096, from: "client", to: "app", protocol: "WSS", info: "ICE candidate — srflx 198.51.100.7:54321", size: "186 B", kind: "request", step: 1, label: "CANDIDATE" },
      { t: 0.14, from: "client", to: "peer", protocol: "STUN", info: "Connectivity check — USE-CANDIDATE, priority 1853824767", size: "106 B", kind: "control", step: 2, label: "ICE CHECK" },
      { t: 0.182, from: "peer", to: "client", protocol: "STUN", info: "Binding success — the direct path works", size: "106 B", kind: "control", step: 2, label: "PATH SELECTED" },
      { t: 0.198, from: "client", to: "peer", protocol: "DTLS", info: "ClientHello — securing the selected path", size: "248 B", kind: "secure", step: 3, label: "DTLS HELLO" },
      { t: 0.241, from: "peer", to: "client", protocol: "DTLS", info: "ServerHello, Certificate, Finished — fingerprint matches the SDP", size: "1.4 KB", kind: "secure", step: 3, label: "DTLS DONE" },
      { t: 0.262, from: "client", to: "peer", protocol: "SRTP", info: "Opus audio, SSRC 0x4a1b, seq 1 (encrypted)", size: "168 B", kind: "media", step: 4, label: "AUDIO →" },
      { t: 0.264, from: "peer", to: "client", protocol: "SRTP", info: "VP8 video keyframe, SSRC 0x7f22 (encrypted)", size: "24.6 KB", kind: "media", step: 4, label: "← VIDEO" },
      { t: 1.262, from: "peer", to: "client", protocol: "RTCP", info: "Receiver report — 0.2% loss, 8 ms jitter", size: "84 B", kind: "control", step: 4, label: "RTCP REPORT" },
    ],
  },
];
