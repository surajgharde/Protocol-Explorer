/**
 * UI icons. All share a 16x16 box and inherit colour, so they sit on any
 * button without further styling.
 */
type IconProps = { size?: number };

function Svg({ size = 15, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5 14 14" />
  </Svg>
);

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M13 3l-1 1M4 12l-1 1" />
  </Svg>
);

export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z" />
  </Svg>
);

export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="M1.8 8h12.4M8 1.8c1.7 1.9 2.6 4 2.6 6.2S9.7 12.3 8 14.2C6.3 12.3 5.4 10.2 5.4 8S6.3 3.7 8 1.8Z" />
  </Svg>
);

export const PanelLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.4" />
    <path d="M6.2 2.8v10.4" />
  </Svg>
);

export const PanelRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.4" />
    <path d="M9.8 2.8v10.4" />
  </Svg>
);

export const PanelBottomIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.4" />
    <path d="M1.8 9.4h12.4" />
  </Svg>
);

export const ExpandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 1.8H1.8V6M10 1.8h4.2V6M6 14.2H1.8V10M10 14.2h4.2V10" />
  </Svg>
);

export const PlayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 2.8 13 8l-8.5 5.2Z" fill="currentColor" />
  </Svg>
);

export const PauseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.4 3v10M10.6 3v10" strokeWidth="2.4" />
  </Svg>
);

export const StepIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 3 10 8l-6.5 5Z" fill="currentColor" />
    <path d="M12.6 3v10" />
  </Svg>
);

export const BackIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12.5 3 6 8l6.5 5Z" fill="currentColor" />
    <path d="M3.4 3v10" />
  </Svg>
);

export const ResetIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.6 8a5.6 5.6 0 1 1-1.8-4.1" />
    <path d="M13.8 1.8v3.6h-3.6" />
  </Svg>
);

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </Svg>
);

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3.5 5.5 8 10 12.5" />
  </Svg>
);

export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 1.8 14.2 5 8 8.2 1.8 5Z" />
    <path d="M1.8 8.2 8 11.4l6.2-3.2M1.8 11.2 8 14.4l6.2-3.2" />
  </Svg>
);

export const SequenceIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.4 2v12M12.6 2v12" />
    <path d="M3.4 6h9.2M12.6 6l-2-1.6M12.6 6l-2 1.6" />
    <path d="M12.6 10.6H3.4M3.4 10.6l2-1.6M3.4 10.6l2 1.6" />
  </Svg>
);

export const KeyboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.4" y="4" width="13.2" height="8" rx="1.4" />
    <path d="M4 6.6h.01M6.6 6.6h.01M9.2 6.6h.01M11.8 6.6h.01M5 9.4h6" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.4 6.4 12 13 4.6" strokeWidth="2" />
  </Svg>
);

/** The cube in the masthead, drawn as a blueprint corner-bracketed mark. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M1 10V1h9M38 1h9v9M47 38v9h-9M10 47H1v-9" opacity="0.5" />
        <path d="M24 9 38 16.5v15L24 39 10 31.5v-15Z" />
        <path d="M24 9v30M24 24 10 16.5M24 24l14-7.5" opacity="0.65" />
      </g>
    </svg>
  );
}
