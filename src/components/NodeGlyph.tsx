import type { NodeKind } from "@/data/types";

/**
 * Line-art device glyphs for the network map.
 *
 * Each is drawn around the origin in roughly a 72x60 box so the caller can
 * place one with a single translate. `.glyph-fill` paints the panel colour
 * behind a shape so links appear to pass behind the device rather than
 * through it; `.glyph` is stroke only.
 */
export function NodeGlyph({ kind }: { kind: NodeKind }) {
  switch (kind) {
    case "laptop":
    case "client":
      return (
        <g>
          <rect x="-24" y="-26" width="48" height="32" rx="2" className="glyph-fill" />
          <rect x="-19" y="-21" width="38" height="22" className="glyph" />
          <path d="M-31 6 H31 L35 14 H-35 Z" className="glyph-fill" />
          <path d="M-7 10 H7" className="glyph" />
        </g>
      );

    case "phone":
      return (
        <g>
          <rect x="-13" y="-26" width="26" height="48" rx="4" className="glyph-fill" />
          <rect x="-9" y="-21" width="18" height="34" className="glyph" />
          <circle cx="0" cy="17" r="1.8" className="glyph" />
        </g>
      );

    case "router":
      return (
        <g>
          <path d="M0 -4 V-18 M0 -18 L-11 -27 M0 -18 L11 -27" className="glyph" />
          <circle cx="-11" cy="-28" r="2" className="glyph" />
          <circle cx="11" cy="-28" r="2" className="glyph" />
          <rect x="-32" y="-4" width="64" height="21" rx="3" className="glyph-fill" />
          <path d="M-22 8 h7 M-10 8 h7 M2 8 h7 M14 8 h7" className="glyph" />
        </g>
      );

    case "switch":
      return (
        <g>
          <rect x="-34" y="-10" width="68" height="22" rx="2" className="glyph-fill" />
          <path d="M-27 4 h6 M-18 4 h6 M-9 4 h6 M0 4 h6 M9 4 h6 M18 4 h6" className="glyph" />
          <circle cx="-27" cy="-4" r="1.6" className="glyph" />
          <circle cx="-21" cy="-4" r="1.6" className="glyph" />
        </g>
      );

    case "server":
      return (
        <g>
          <rect x="-19" y="-30" width="38" height="60" rx="2" className="glyph-fill" />
          <path d="M-12 -20 H12 M-12 -10 H12 M-12 0 H12" className="glyph" />
          <circle cx="-8" cy="16" r="2.4" className="glyph" />
          <path d="M-1 16 H12" className="glyph" />
        </g>
      );

    case "rack":
      return (
        <g>
          <rect x="-26" y="-27" width="52" height="17" rx="1.5" className="glyph-fill" />
          <rect x="-26" y="-8" width="52" height="17" rx="1.5" className="glyph-fill" />
          <rect x="-26" y="11" width="52" height="17" rx="1.5" className="glyph-fill" />
          <circle cx="-18" cy="-18.5" r="2" className="glyph" />
          <circle cx="-18" cy="0.5" r="2" className="glyph" />
          <circle cx="-18" cy="19.5" r="2" className="glyph" />
          <path d="M-10 -18.5 H17 M-10 0.5 H17 M-10 19.5 H17" className="glyph" />
        </g>
      );

    case "cloud":
      return (
        <g>
          <path
            d="M-30 14 C-41 14 -41 -4 -29 -6 C-29 -23 -6 -28 3 -16 C11 -25 28 -19 26 -6 C36 -4 34 14 24 14 Z"
            className="glyph-fill"
          />
          <circle cx="-2" cy="0" r="10" className="glyph" />
          <path d="M-12 0 H8 M-2 -10 C3 -5 3 5 -2 10 C-7 5 -7 -5 -2 -10" className="glyph" />
        </g>
      );

    case "camera":
      return (
        <g>
          <path d="M-28 -13 H8 A7 7 0 0 1 15 -6 V7 A7 7 0 0 1 8 14 H-28 Z" className="glyph-fill" />
          <circle cx="-6" cy="0.5" r="7.5" className="glyph" />
          <path d="M15 -4 L29 -12 V13 L15 5 Z" className="glyph-fill" />
          <path d="M-20 -4 h4" className="glyph" />
          <path d="M-8 14 V24 M-18 24 H2" className="glyph" />
        </g>
      );

    case "tv":
      return (
        <g>
          <rect x="-32" y="-24" width="64" height="40" rx="2" className="glyph-fill" />
          <rect x="-26" y="-18" width="52" height="28" className="glyph" />
          <path d="M0 16 V24 M-13 24 H13" className="glyph" />
        </g>
      );

    case "shield":
      return (
        <g>
          <path
            d="M0 -28 L24 -18 V2 C24 16 12 25 0 29 C-12 25 -24 16 -24 2 V-18 Z"
            className="glyph-fill"
          />
          <rect x="-9" y="-5" width="18" height="14" rx="2" className="glyph" />
          <path d="M-5 -5 V-10 A5 5 0 0 1 5 -10 V-5" className="glyph" />
        </g>
      );

    case "printer":
      return (
        <g>
          <rect x="-16" y="-26" width="32" height="18" className="glyph-fill" />
          <rect x="-26" y="-8" width="52" height="24" rx="2" className="glyph-fill" />
          <path d="M-16 16 H16 V26 H-16 Z" className="glyph-fill" />
          <circle cx="18" cy="-1" r="2" className="glyph" />
        </g>
      );
  }
}
