"use client";

import { availableLayers, layerNames } from "@/data";
import {
  BrandMark,
  ExpandIcon,
  KeyboardIcon,
  MoonIcon,
  PanelBottomIcon,
  PanelLeftIcon,
  PanelRightIcon,
  SearchIcon,
  SunIcon,
} from "./Icons";

const LAYERS = [1, 2, 3, 4, 5, 6, 7];

export function Header({
  layer,
  onLayer,
  theme,
  onTheme,
  onSearch,
  onShortcuts,
  panels,
  onTogglePanel,
  focusMode,
  onFocusMode,
}: {
  layer: number | null;
  onLayer: (layer: number | null) => void;
  theme: "light" | "dark";
  onTheme: (theme: "light" | "dark") => void;
  onSearch: () => void;
  onShortcuts: () => void;
  panels: { rail: boolean; capture: boolean; aside: boolean };
  onTogglePanel: (panel: "rail" | "capture" | "aside") => void;
  focusMode: boolean;
  onFocusMode: () => void;
}) {
  return (
    <header className="header">
      <div className="brand">
        <BrandMark />
        <div>
          <h1 className="brand-name">
            Protocol <em>Explorer</em>
          </h1>
          <p className="brand-sub">Learn how the internet works</p>
        </div>
      </div>

      <div className="header-group">
        <span className="label">OSI Layer</span>
        <div className="layer-switch" role="group" aria-label="Filter by OSI layer">
          {LAYERS.map((n) => {
            const usable = availableLayers.includes(n);
            return (
              <button
                key={n}
                type="button"
                className="layer-btn"
                aria-pressed={layer === n}
                aria-label={`Layer ${n} — ${layerNames[n]}`}
                title={`Layer ${n} — ${layerNames[n]}`}
                disabled={!usable}
                onClick={() => onLayer(layer === n ? null : n)}
              >
                {n}
              </button>
            );
          })}
        </div>
        <span className="label">{layer ? layerNames[layer] : "All layers"}</span>
      </div>

      <div className="header-spacer" />

      <button type="button" className="search-trigger" onClick={onSearch}>
        <SearchIcon size={13} />
        Search protocols
        <kbd>Ctrl K</kbd>
      </button>

      <div className="btn-set">
        <button
          type="button"
          className="icon-btn"
          aria-pressed={panels.rail}
          aria-label="Toggle the protocol list"
          title="Toggle the protocol list"
          onClick={() => onTogglePanel("rail")}
        >
          <PanelLeftIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={panels.capture}
          aria-label="Toggle the packet table"
          title="Toggle the packet table"
          onClick={() => onTogglePanel("capture")}
        >
          <PanelBottomIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={panels.aside}
          aria-label="Toggle the detail panel"
          title="Toggle the detail panel"
          onClick={() => onTogglePanel("aside")}
        >
          <PanelRightIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={focusMode}
          aria-label="Diagram only"
          title="Diagram only"
          onClick={onFocusMode}
        >
          <ExpandIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          onClick={onShortcuts}
        >
          <KeyboardIcon />
        </button>
      </div>

      <div className="btn-set">
        <button
          type="button"
          className="icon-btn"
          aria-pressed={theme === "light"}
          aria-label="Light theme"
          title="Light theme"
          onClick={() => onTheme("light")}
        >
          <SunIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={theme === "dark"}
          aria-label="Dark theme"
          title="Dark theme"
          onClick={() => onTheme("dark")}
        >
          <MoonIcon />
        </button>
      </div>
    </header>
  );
}
