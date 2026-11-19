import type { Protocol } from "../types";
import { links, nodes } from "../topology";

export const securityProtocols: Protocol[] = [
  {
    id: "https",
    name: "HTTPS",
    fullName: "HTTP over TLS",
    tagline: "The whole encrypted page load",
    category: "security",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "443",
    transport: "TCP with TLS 1.3",
    format: "HTTP messages inside TLS records",
    rfc: "RFC 9110, RFC 8446",
    extra: [
      { label: "PROTECTS", value: "Confidentiality, integrity, server identity" },
      { label: "STILL VISIBLE", value: "The destination IP, and the SNI hostname" },
    ],
    description:
      "HTTPS is not a separate protocol so much as HTTP placed inside a TLS tunnel. The interesting part is everything that has to happen first: a DNS lookup, a TCP handshake, then a TLS handshake that authenticates the server and agrees fresh keys. Only after all three does the request itself go out — and from the network's point of view it is now indistinguishable from any other encrypted bytes.",
    nodes: nodes("client", ["router", { passive: true }], "resolver", "web", "internet"),
    links: links("client-router", "router-resolver", "router-web", "router-internet~"),
    steps: [
      {
        title: "Resolve the name",
        summary: "Still a plaintext lookup by default",
        detail:
          "Before anything can be encrypted the browser needs an address, and an ordinary DNS query is not itself protected. Anyone watching the network learns which site you are about to visit even though they will see none of the traffic. DNS over HTTPS and DNS over TLS exist to close exactly this gap.",
        facts: [
          { label: "LEAKS", value: "The hostname, to anyone on the path" },
          { label: "FIX", value: "DoH or DoT encrypts the lookup too" },
        ],
      },
      {
        title: "TCP connection",
        summary: "A plain handshake to port 443",
        detail:
          "TLS needs a reliable ordered stream underneath it, so an ordinary TCP connection is opened first. These three segments are unencrypted — there is nothing secret in them — but they cost a full round trip before the TLS handshake can even begin.",
        facts: [
          { label: "PORT", value: "443" },
          { label: "COST", value: "1 RTT, before any TLS" },
        ],
      },
      {
        title: "TLS handshake",
        summary: "Prove identity, agree keys",
        detail:
          "The ClientHello offers cipher suites and includes a key share, so that in TLS 1.3 the server can reply with its own share and immediately derive keys. The certificate chain proves the server controls this hostname, validated against the browser's trusted roots. By the second flight everything after the ServerHello is already encrypted.",
        facts: [
          { label: "SNI", value: "Names the host — visible on the wire" },
          { label: "COST", value: "1 RTT in TLS 1.3, 2 in TLS 1.2" },
        ],
      },
      {
        title: "The encrypted request",
        summary: "The real GET, finally",
        detail:
          "The HTTP request goes out as a TLS application-data record. An observer sees the destination address, the SNI hostname from the handshake and the rough size and timing of each record — but not the path, the headers, the cookies or the body.",
        facts: [
          { label: "RECORD TYPE", value: "23 — application data" },
          { label: "HIDDEN", value: "Path, headers, cookies, body" },
        ],
      },
      {
        title: "The encrypted response",
        summary: "And a clean shutdown",
        detail:
          "The page comes back inside the same tunnel. When the connection ends, a close_notify alert signals a deliberate shutdown — which matters, because without it a client cannot distinguish a finished response from one an attacker truncated part way through.",
        facts: [
          { label: "CLOSE_NOTIFY", value: "Proves the response was not truncated" },
          { label: "REUSE", value: "Session tickets skip the handshake next time" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "resolver", protocol: "DNS", info: "Standard query A www.example.com — not encrypted", size: "75 B", kind: "dns", step: 0, label: "DNS QUERY" },
      { t: 0.012, from: "resolver", to: "client", protocol: "DNS", info: "Standard query response A 203.0.113.10", size: "91 B", kind: "dns", step: 0, label: "DNS REPLY" },
      { t: 0.024, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [SYN] Seq=0", size: "74 B", kind: "transport", step: 1, label: "SYN" },
      { t: 0.042, from: "web", to: "client", protocol: "TCP", info: "443 → 52344 [SYN, ACK] Seq=0 Ack=1", size: "74 B", kind: "transport", step: 1, label: "SYN-ACK" },
      { t: 0.06, from: "client", to: "web", protocol: "TCP", info: "52344 → 443 [ACK] Seq=1 Ack=1", size: "66 B", kind: "transport", step: 1, label: "ACK" },
      { t: 0.061, from: "client", to: "web", protocol: "TLSv1.3", info: "Client Hello — SNI www.example.com, key_share x25519", size: "571 B", kind: "secure", step: 2, label: "CLIENT HELLO", payload: "SNI: www.example.com  ·  Versions: TLS 1.3  ·  Groups: x25519, secp256r1" },
      { t: 0.08, from: "web", to: "client", protocol: "TLSv1.3", info: "Server Hello, Encrypted Extensions, Certificate, Finished", size: "4.1 KB", kind: "secure", step: 2, label: "SERVER HELLO + CERT" },
      { t: 0.099, from: "client", to: "web", protocol: "TLSv1.3", info: "Finished — certificate chain validated against the trust store", size: "80 B", kind: "secure", step: 2, label: "FINISHED" },
      { t: 0.1, from: "client", to: "web", protocol: "HTTP/2", info: "Application Data — GET / (encrypted)", size: "512 B", kind: "request", step: 3, label: "GET / · encrypted" },
      { t: 0.119, from: "web", to: "client", protocol: "HTTP/2", info: "Application Data — 200 OK, text/html (encrypted)", size: "13.4 KB", kind: "response", step: 4, label: "200 OK · encrypted" },
      { t: 0.3, from: "client", to: "web", protocol: "TLSv1.3", info: "Alert — close_notify", size: "55 B", kind: "control", step: 4, label: "CLOSE NOTIFY" },
    ],
  },

  {
    id: "tls",
    name: "TLS",
    fullName: "Transport Layer Security",
    tagline: "The handshake behind the padlock",
    category: "security",
    layer: 6,
    layerName: "Presentation (Layer 6)",
    port: "Any — 443 is merely the common case",
    transport: "TCP (DTLS runs over UDP)",
    format: "Records carrying handshake or data",
    rfc: "RFC 8446",
    extra: [
      { label: "VERSION", value: "1.3 — 1.0 and 1.1 are deprecated" },
      { label: "FORWARD SECRECY", value: "Mandatory in 1.3" },
    ],
    description:
      "TLS gives any TCP connection three properties: nobody can read it, nobody can alter it undetected, and you know who you are talking to. Version 1.3 stripped the protocol back hard — removing RSA key transport, static Diffie-Hellman and every cipher without authenticated encryption — and in doing so cut the handshake from two round trips to one.",
    nodes: nodes("client", ["router", { passive: true }], ["web", { y: 255, label: "TLS Server", sublabel: "203.0.113.10" }]),
    links: links("client-router", "router-web"),
    steps: [
      {
        title: "Client Hello",
        summary: "Offer everything, and guess the key",
        detail:
          "The client lists the cipher suites it supports, a random nonce, and — new in 1.3 — a key share for the group it expects the server to pick. Guessing correctly saves a whole round trip. If the server wants a different group it sends a HelloRetryRequest and the client tries again.",
        facts: [
          { label: "KEY SHARE", value: "An x25519 public key, sent speculatively" },
          { label: "SNI", value: "The hostname, so one IP can serve many sites" },
        ],
      },
      {
        title: "Server Hello",
        summary: "Keys exist from this point on",
        detail:
          "The server picks a cipher suite and returns its own key share. Both sides can now compute the same shared secret through Diffie-Hellman and derive handshake traffic keys. Everything the server sends after the ServerHello — including its certificate — is already encrypted, which TLS 1.2 could not do.",
        facts: [
          { label: "CIPHER", value: "TLS_AES_128_GCM_SHA256" },
          { label: "SECRET", value: "Derived by ECDHE — never transmitted" },
        ],
      },
      {
        title: "Certificate and verify",
        summary: "Proving the key belongs to this name",
        detail:
          "The chain links the server's certificate to a root the client already trusts. CertificateVerify then has the server sign a transcript of the handshake with its private key — proving it actually holds the key in the certificate rather than merely having a copy of someone else's.",
        facts: [
          { label: "CHAIN", value: "Leaf, intermediate, then a trusted root" },
          { label: "CHECKED", value: "Hostname, validity dates, revocation" },
        ],
      },
      {
        title: "Finished",
        summary: "A MAC over everything said so far",
        detail:
          "Each side sends a Finished message containing a MAC over the full handshake transcript. If any part had been altered in flight the values would not match and the connection aborts. This is what makes downgrade attacks — tricking both sides into a weaker cipher — detectable.",
        facts: [
          { label: "COVERS", value: "Every handshake byte exchanged" },
          { label: "THEN", value: "Application traffic keys take over" },
        ],
      },
      {
        title: "Session tickets",
        summary: "Skipping the handshake next time",
        detail:
          "The server issues tickets encapsulating enough state to resume. On the next connection the client presents one and can even send data in its very first flight — 0-RTT. That early data is not forward secret and can be replayed, so it is restricted to idempotent requests.",
        facts: [
          { label: "RESUMPTION", value: "0-RTT — data in the first packet" },
          { label: "CAVEAT", value: "Early data is replayable; GET only" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "web", protocol: "TLSv1.3", info: "Client Hello — 17 cipher suites, key_share x25519, SNI set", size: "571 B", kind: "secure", step: 0, label: "CLIENT HELLO" },
      { t: 0.019, from: "web", to: "client", protocol: "TLSv1.3", info: "Server Hello — TLS_AES_128_GCM_SHA256, key_share x25519", size: "155 B", kind: "secure", step: 1, label: "SERVER HELLO" },
      { t: 0.02, from: "web", to: "client", protocol: "TLSv1.3", info: "Encrypted Extensions, Certificate (2 in chain), Certificate Verify", size: "3.8 KB", kind: "secure", step: 2, label: "CERT CHAIN" },
      { t: 0.021, from: "web", to: "client", protocol: "TLSv1.3", info: "Finished — MAC over the handshake transcript", size: "58 B", kind: "secure", step: 3, label: "SERVER FINISHED" },
      { t: 0.038, from: "client", to: "web", protocol: "TLSv1.3", info: "Finished — client transcript MAC, chain validated", size: "58 B", kind: "secure", step: 3, label: "CLIENT FINISHED" },
      { t: 0.039, from: "client", to: "web", protocol: "TLSv1.3", info: "Application Data — 1-RTT, keys now in use", size: "512 B", kind: "request", step: 3, label: "APP DATA" },
      { t: 0.058, from: "web", to: "client", protocol: "TLSv1.3", info: "New Session Ticket (2 issued) — enables 0-RTT resumption", size: "362 B", kind: "secure", step: 4, label: "SESSION TICKET" },
      { t: 0.312, from: "client", to: "web", protocol: "TLSv1.3", info: "Alert — close_notify", size: "55 B", kind: "control", step: 4, label: "CLOSE NOTIFY" },
    ],
  },

  {
    id: "ssh",
    name: "SSH",
    fullName: "Secure Shell",
    tagline: "An encrypted shell on a remote machine",
    category: "security",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "22",
    transport: "TCP",
    format: "Binary packets inside a secure channel",
    rfc: "RFC 4251 to RFC 4254",
    extra: [
      { label: "TRUST MODEL", value: "Known hosts, not certificate authorities" },
      { label: "ALSO CARRIES", value: "SFTP, port forwarding, SCP" },
    ],
    description:
      "SSH replaced telnet by encrypting everything, but its more interesting difference is how it establishes trust. There is no certificate authority: the first time you connect, your client records the server's host key, and from then on a changed key is treated as an attack. On top of one authenticated connection it multiplexes channels — a shell, a file transfer, forwarded ports.",
    nodes: nodes("client", ["router", { passive: true }], ["app", { x: 700, y: 255, label: "SSH Server", sublabel: "198.51.100.77" }]),
    links: links("client-router", "router-app"),
    steps: [
      {
        title: "Version exchange",
        summary: "Two lines of plain text",
        detail:
          "Both sides send a banner naming their protocol version and software. These strings are in the clear, and they are also hashed into the key exchange later — so an attacker who edits them to force a weaker version breaks the resulting signature and is caught.",
        facts: [
          { label: "FORMAT", value: "SSH-2.0-OpenSSH_9.6" },
          { label: "BOUND IN", value: "Hashed into the exchange hash" },
        ],
      },
      {
        title: "Key exchange",
        summary: "Algorithms, then an ephemeral secret",
        detail:
          "Each side sends a KEXINIT listing supported algorithms in preference order, and the first mutual match in each category wins. An ephemeral Diffie-Hellman exchange over Curve25519 then produces a shared secret that exists only for this session — so a stolen host key cannot decrypt traffic captured earlier.",
        facts: [
          { label: "KEX", value: "curve25519-sha256" },
          { label: "CIPHER", value: "chacha20-poly1305@openssh.com" },
        ],
      },
      {
        title: "Host key check",
        summary: "Have I seen this server before?",
        detail:
          "The server signs the exchange hash with its host key and sends the public half. The client looks it up in known_hosts. An unknown key prompts that fingerprint question everyone clicks through; a changed key produces a loud warning, because the only innocent explanation is that the server was genuinely rebuilt.",
        facts: [
          { label: "STORE", value: "~/.ssh/known_hosts" },
          { label: "ON CHANGE", value: "The client refuses to continue" },
        ],
      },
      {
        title: "User authentication",
        summary: "Usually a key, not a password",
        detail:
          "With the channel already encrypted, the client authenticates. Public key authentication has it sign a challenge containing the session identifier with its private key — so the signature is useless on any other connection, and nothing reusable is ever transmitted. The server checks it against authorized_keys.",
        facts: [
          { label: "METHODS", value: "publickey, password, keyboard-interactive" },
          { label: "SIGNS", value: "A challenge bound to this session" },
        ],
      },
      {
        title: "The interactive channel",
        summary: "A shell, multiplexed with everything else",
        detail:
          "Channels are opened within the connection. A session channel requests a pseudo-terminal and starts a shell; the same connection can simultaneously carry an SFTP transfer and several forwarded TCP ports, each flow-controlled independently. Even single keystrokes become encrypted packets, which is why the padding exists — to blur their length.",
        facts: [
          { label: "MULTIPLEXED", value: "Many channels on one connection" },
          { label: "PADDING", value: "Obscures how long each keystroke was" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "app", protocol: "SSHv2", info: "Client protocol: SSH-2.0-OpenSSH_9.6", size: "32 B", kind: "control", step: 0, label: "VERSION →" },
      { t: 0.017, from: "app", to: "client", protocol: "SSHv2", info: "Server protocol: SSH-2.0-OpenSSH_9.3", size: "32 B", kind: "control", step: 0, label: "← VERSION" },
      { t: 0.034, from: "client", to: "app", protocol: "SSHv2", info: "KEXINIT — curve25519-sha256, chacha20-poly1305, ssh-ed25519", size: "1.1 KB", kind: "secure", step: 1, label: "KEXINIT →" },
      { t: 0.051, from: "app", to: "client", protocol: "SSHv2", info: "KEXINIT — server algorithm preferences", size: "1.0 KB", kind: "secure", step: 1, label: "← KEXINIT" },
      { t: 0.068, from: "client", to: "app", protocol: "SSHv2", info: "KEX_ECDH_INIT — client ephemeral public key", size: "48 B", kind: "secure", step: 1, label: "ECDH INIT" },
      { t: 0.089, from: "app", to: "client", protocol: "SSHv2", info: "KEX_ECDH_REPLY — host key ed25519 and signature", size: "548 B", kind: "secure", step: 2, label: "HOST KEY + SIG" },
      { t: 0.106, from: "client", to: "app", protocol: "SSHv2", info: "NEWKEYS — host key matched known_hosts", size: "16 B", kind: "secure", step: 2, label: "NEWKEYS" },
      { t: 0.123, from: "client", to: "app", protocol: "SSHv2", info: "USERAUTH_REQUEST — publickey, ssh-ed25519 (encrypted)", size: "384 B", kind: "secure", step: 3, label: "PUBLICKEY AUTH" },
      { t: 0.148, from: "app", to: "client", protocol: "SSHv2", info: "USERAUTH_SUCCESS", size: "16 B", kind: "response", step: 3, label: "AUTH OK" },
      { t: 0.162, from: "client", to: "app", protocol: "SSHv2", info: "CHANNEL_OPEN session, PTY_REQ xterm-256color 120x40", size: "128 B", kind: "request", step: 4, label: "OPEN SHELL" },
      { t: 0.18, from: "app", to: "client", protocol: "SSHv2", info: "CHANNEL_DATA — shell prompt (encrypted)", size: "96 B", kind: "response", step: 4, label: "PROMPT" },
      { t: 1.42, from: "client", to: "app", protocol: "SSHv2", info: "CHANNEL_DATA — one keystroke, padded (encrypted)", size: "52 B", kind: "request", step: 4, label: "KEYSTROKE" },
    ],
  },

  {
    id: "doh",
    name: "DNS over HTTPS",
    fullName: "DNS Queries over HTTPS",
    tagline: "Hiding the lookup itself",
    category: "security",
    layer: 7,
    layerName: "Application (Layer 7)",
    port: "443",
    transport: "TCP with TLS, usually HTTP/2",
    format: "DNS wire format in an HTTP body",
    rfc: "RFC 8484",
    extra: [
      { label: "MEDIA TYPE", value: "application/dns-message" },
      { label: "TRADE-OFF", value: "Hides queries from the ISP, exposes them to the resolver" },
    ],
    description:
      "Ordinary DNS is plaintext UDP, so every network you use can see — and rewrite — the names you look up. DoH wraps the same queries in an HTTPS request to a resolver, making them indistinguishable from other web traffic. The protection is real but partial: the resolver you chose still sees every query, and the TLS connection to the site afterwards still reveals the hostname in its SNI.",
    nodes: nodes("client", ["router", { passive: true }], ["resolver", { x: 640, y: 120, label: "DoH Resolver", sublabel: "1.1.1.1" }], "web"),
    links: links("client-router", "router-resolver", "router-web"),
    steps: [
      {
        title: "Bootstrap",
        summary: "A chicken-and-egg problem",
        detail:
          "To use cloudflare-dns.com you must first resolve it — with plain DNS, the very thing you are trying to avoid. Clients sidestep this by shipping the resolver's IP address directly in configuration, so the first connection needs no lookup at all.",
        facts: [
          { label: "HARD-CODED", value: "1.1.1.1 and 8.8.8.8 ship in the config" },
          { label: "WHY", value: "Otherwise the first lookup leaks in cleartext" },
        ],
      },
      {
        title: "TLS to the resolver",
        summary: "An ordinary HTTPS connection",
        detail:
          "A normal TLS 1.3 handshake runs to port 443. To anything watching, this looks exactly like loading a website — which is the point. DNS over TLS, the alternative, uses a dedicated port 853 and is therefore trivial to block; DoH hides among all other web traffic.",
        facts: [
          { label: "PORT", value: "443 — the same as every website" },
          { label: "VERSUS DoT", value: "Port 853 is easy to identify and block" },
        ],
      },
      {
        title: "The query inside HTTPS",
        summary: "A POST to /dns-query",
        detail:
          "The body is the same binary DNS message that would otherwise have gone over UDP — no re-encoding, just a different envelope. A GET variant encodes it base64url in the URL so the response can be cached by ordinary HTTP machinery. The connection is reused for every subsequent lookup.",
        facts: [
          { label: "PATH", value: "/dns-query" },
          { label: "BODY", value: "Standard DNS wire format" },
        ],
      },
      {
        title: "The answer comes back",
        summary: "200 OK, with a record inside",
        detail:
          "The response carries the DNS answer plus a Cache-Control max-age mirroring the record's TTL. The client caches it exactly as it would a UDP answer. Everything an observer saw was an encrypted exchange with a resolver they already knew you were using.",
        facts: [
          { label: "STATUS", value: "200 OK, application/dns-message" },
          { label: "CACHING", value: "max-age mirrors the DNS TTL" },
        ],
      },
      {
        title: "Then the site itself",
        summary: "Where the privacy ends",
        detail:
          "The browser now connects to 203.0.113.10. The destination address is plainly visible, and unless Encrypted Client Hello is in use the hostname appears in cleartext in the TLS SNI. DoH hid which names you asked about; it did not hide which servers you then talked to.",
        facts: [
          { label: "STILL VISIBLE", value: "The destination IP and the SNI" },
          { label: "NEXT STEP", value: "Encrypted Client Hello conceals the SNI" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "resolver", protocol: "TCP", info: "52344 → 443 [SYN] to the hard-coded resolver address", size: "74 B", kind: "transport", step: 0, label: "SYN :443" },
      { t: 0.018, from: "resolver", to: "client", protocol: "TCP", info: "443 → 52344 [SYN, ACK]", size: "74 B", kind: "transport", step: 0, label: "SYN-ACK" },
      { t: 0.036, from: "client", to: "resolver", protocol: "TLSv1.3", info: "Client Hello — SNI cloudflare-dns.com, ALPN h2", size: "517 B", kind: "secure", step: 1, label: "CLIENT HELLO" },
      { t: 0.055, from: "resolver", to: "client", protocol: "TLSv1.3", info: "Server Hello, Certificate, Finished", size: "3.6 KB", kind: "secure", step: 1, label: "SERVER HELLO + CERT" },
      { t: 0.074, from: "client", to: "resolver", protocol: "HTTP/2", info: "POST /dns-query, application/dns-message (encrypted)", size: "198 B", kind: "request", step: 2, label: "POST /dns-query", payload: "Body: the same DNS query bytes that UDP would have carried" },
      { t: 0.094, from: "resolver", to: "client", protocol: "HTTP/2", info: "200 OK, application/dns-message — A 203.0.113.10 (encrypted)", size: "142 B", kind: "response", step: 3, label: "200 OK · answer" },
      { t: 0.11, from: "client", to: "web", protocol: "TCP", info: "52346 → 443 [SYN] to 203.0.113.10 — destination now visible", size: "74 B", kind: "transport", step: 4, label: "SYN to the site" },
      { t: 0.129, from: "web", to: "client", protocol: "TCP", info: "443 → 52346 [SYN, ACK]", size: "74 B", kind: "transport", step: 4, label: "SYN-ACK" },
      { t: 0.148, from: "client", to: "web", protocol: "TLSv1.3", info: "Client Hello — SNI www.example.com in cleartext", size: "571 B", kind: "secure", step: 4, label: "SNI STILL VISIBLE" },
    ],
  },

  {
    id: "wireguard",
    name: "WireGuard",
    fullName: "WireGuard VPN",
    tagline: "A VPN small enough to audit",
    category: "security",
    layer: 3,
    layerName: "Network (Layer 3)",
    port: "51820 by default, over UDP",
    transport: "UDP",
    format: "Four message types, fixed sizes",
    rfc: "Whitepaper, not an IETF RFC",
    extra: [
      { label: "CODE SIZE", value: "About 4,000 lines — IPsec is hundreds of thousands" },
      { label: "CRYPTO", value: "Fixed suite, nothing to negotiate" },
    ],
    description:
      "WireGuard's design decision was to remove choices. There is no cipher negotiation, no algorithm agility, no extensive configuration — one modern construction, taken or left. The result is a protocol with four message types and a codebase small enough to read in an afternoon, which is itself a security property. Peers are identified by public key alone, and a tunnel is simply a network interface.",
    nodes: nodes(
      "client",
      ["router", { passive: true }],
      ["gateway", { x: 620, y: 255, label: "VPN Gateway", sublabel: "198.51.100.9" }],
      ["app", { x: 880, y: 255, label: "Internal Server", sublabel: "10.0.0.20" }],
    ),
    links: links("client-router", "router-gateway", "gateway-app"),
    steps: [
      {
        title: "Handshake initiation",
        summary: "One 148 byte message",
        detail:
          "The initiator sends a fixed-size message built on the Noise protocol framework: an ephemeral public key, its own static key encrypted under a key derived from the responder's, and a timestamp that prevents replay. Nothing is negotiated because there is nothing to negotiate.",
        facts: [
          { label: "SIZE", value: "Always 148 bytes" },
          { label: "FRAMEWORK", value: "Noise IKpsk2" },
        ],
      },
      {
        title: "Handshake response",
        summary: "92 bytes, and the tunnel exists",
        detail:
          "The responder replies with its own ephemeral key and both sides derive sending and receiving keys. That is the entire handshake: one round trip, two packets, no certificates and no authority. Identity is the public key, which you configured out of band.",
        facts: [
          { label: "SIZE", value: "Always 92 bytes" },
          { label: "COST", value: "1 RTT, then data flows" },
        ],
      },
      {
        title: "Transport data",
        summary: "Encrypted IP packets with a counter",
        detail:
          "Each transport message carries a receiver index, a 64-bit counter and the encrypted packet. The counter feeds a sliding replay window, so a duplicate or a very late packet is dropped. WireGuard is silent by design — an unrecognised or unauthenticated packet gets no answer at all, so a scanner cannot tell the port is open.",
        facts: [
          { label: "AEAD", value: "ChaCha20-Poly1305" },
          { label: "SILENCE", value: "Unauthenticated packets are never answered" },
        ],
      },
      {
        title: "Inside the tunnel",
        summary: "Ordinary routing resumes",
        detail:
          "The gateway decrypts, checks the inner source address against that peer's allowed IPs — the cryptokey routing table that binds an address range to a public key — and forwards the plaintext packet onward. A peer cannot spoof an address outside its allowed range, because the check is tied to the key that decrypted it.",
        facts: [
          { label: "ALLOWED IPS", value: "Both the routing table and the access control list" },
          { label: "INNER ADDRESS", value: "10.8.0.2" },
        ],
      },
      {
        title: "Rekey",
        summary: "New keys every couple of minutes",
        detail:
          "After roughly two minutes, or a large volume of data, the handshake runs again and fresh keys replace the old ones. Because the session is defined by keys rather than by an address pair, a roaming client that changes network simply arrives from a new address and the gateway updates its endpoint automatically.",
        facts: [
          { label: "REKEY AFTER", value: "120 seconds or 2^60 messages" },
          { label: "ROAMING", value: "The endpoint updates on any valid packet" },
        ],
      },
    ],
    packets: [
      { t: 0.0, from: "client", to: "gateway", protocol: "WireGuard", info: "Handshake Initiation — sender=0x7a31c204, 148 bytes", size: "148 B", kind: "secure", step: 0, label: "HANDSHAKE INIT" },
      { t: 0.021, from: "gateway", to: "client", protocol: "WireGuard", info: "Handshake Response — receiver=0x7a31c204, 92 bytes", size: "92 B", kind: "secure", step: 1, label: "HANDSHAKE RESPONSE" },
      { t: 0.022, from: "client", to: "gateway", protocol: "WireGuard", info: "Transport Data — counter=0, encrypted IP packet", size: "1.4 KB", kind: "secure", step: 2, label: "DATA counter=0" },
      { t: 0.024, from: "gateway", to: "app", protocol: "IPv4", info: "Decapsulated — 10.8.0.2 → 10.0.0.20, allowed-IPs check passed", size: "1.4 KB", kind: "request", step: 3, label: "PLAINTEXT INSIDE" },
      { t: 0.043, from: "app", to: "gateway", protocol: "IPv4", info: "Reply — 10.0.0.20 → 10.8.0.2", size: "2.1 KB", kind: "response", step: 3, label: "REPLY" },
      { t: 0.045, from: "gateway", to: "client", protocol: "WireGuard", info: "Transport Data — counter=1, encrypted reply", size: "2.1 KB", kind: "secure", step: 3, label: "DATA counter=1" },
      { t: 120.0, from: "client", to: "gateway", protocol: "WireGuard", info: "Handshake Initiation — scheduled rekey after 120 s", size: "148 B", kind: "secure", step: 4, label: "REKEY" },
      { t: 120.019, from: "gateway", to: "client", protocol: "WireGuard", info: "Handshake Response — new keys in use, old ones discarded", size: "92 B", kind: "secure", step: 4, label: "NEW KEYS" },
    ],
  },
];
