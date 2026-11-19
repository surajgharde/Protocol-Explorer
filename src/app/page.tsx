"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { protocols, protocolsById } from "@/data";
import type { ProtocolCategory } from "@/data/types";
import { usePlayback } from "@/lib/usePlayback";
import { CapturePanel } from "@/components/CapturePanel";
import { CommandPalette } from "@/components/CommandPalette";
import { DetailPanel } from "@/components/DetailPanel";
import { Header } from "@/components/Header";
import { CubeIcon, LayersIcon, SequenceIcon } from "@/components/Icons";
import { NetworkDiagram } from "@/components/NetworkDiagram";
import { IsometricDiagram } from "@/components/IsometricDiagram";
import { ProtocolRail } from "@/components/ProtocolRail";
import { SequenceDiagram } from "@/components/SequenceDiagram";

const CAPTURE_NOTE = "Illustrative capture · routine ACKs trimmed";
const THEME_KEY = "protocol-explorer-theme";

type View = "iso" | "network" | "sequence";

/** Order the V key cycles through. */
const viewOrder: View[] = ["iso", "network", "sequence"];

export default function Page() {
  const [selectedId, setSelectedId] = useState(protocols[0].id);
  const [category, setCategory] = useState<ProtocolCategory | "all">("all");
  const [layer, setLayer] = useState<number | null>(null);
  const [view, setView] = useState<View>("iso");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [panels, setPanels] = useState({ rail: true, capture: true, aside: true });
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [forceOverview, setForceOverview] = useState(true);
  const [pinnedStep, setPinnedStep] = useState<number | null>(null);

  const protocol = protocolsById.get(selectedId) ?? protocols[0];
  const playback = usePlayback(protocol.packets);
  const { currentIndex, delivered, flight } = playback;

  /* --- theme ------------------------------------------------------------ */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") setTheme(saved);
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    } catch {
      /* private mode or blocked storage — the default is fine */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* nothing to do — the theme still applies for this session */
    }
  }, [theme]);

  /* --- derived ---------------------------------------------------------- */

  const visibleProtocols = useMemo(
    () =>
      protocols.filter(
        (p) =>
          (category === "all" || p.category === category) &&
          (layer === null || p.layer === layer),
      ),
    [category, layer],
  );

  const address = useCallback(
    (id: string) => {
      const node = protocol.nodes.find((n) => n.id === id);
      return node?.sublabel || node?.label || id;
    },
    [protocol],
  );

  const currentPacket = currentIndex >= 0 ? protocol.packets[currentIndex] : null;
  const currentStep = pinnedStep ?? currentPacket?.step ?? 0;
  const showStep = !forceOverview && (pinnedStep !== null || currentIndex >= 0);

  // Playing past a pinned step hands control back to the capture.
  useEffect(() => {
    if (currentIndex >= 0) setPinnedStep(null);
  }, [currentIndex]);

  // Any movement in the capture reveals the step panel again.
  useEffect(() => {
    if (currentIndex >= 0) setForceOverview(false);
  }, [currentIndex]);

  const selectProtocol = useCallback((id: string) => {
    setSelectedId(id);
    setForceOverview(true);
    setPinnedStep(null);
  }, []);

  const selectStep = useCallback(
    (index: number) => {
      const packetIndex = protocol.packets.findIndex((p) => p.step === index);
      setForceOverview(false);
      if (packetIndex >= 0) {
        setPinnedStep(null);
        playback.seekTo(packetIndex);
      } else {
        playback.pause();
        setPinnedStep(index);
      }
    },
    [protocol, playback],
  );

  /* --- keyboard --------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if (typing || paletteOpen) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          playback.toggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          playback.step();
          break;
        case "ArrowLeft":
          e.preventDefault();
          playback.back();
          break;
        case "Escape":
          setShortcutsOpen(false);
          break;
        default:
          if (e.key.toLowerCase() === "r") playback.reset();
          if (e.key.toLowerCase() === "v")
        setView((v) => viewOrder[(viewOrder.indexOf(v) + 1) % viewOrder.length]);
          if (e.key === "?") setShortcutsOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playback, paletteOpen]);

  /* --- render ----------------------------------------------------------- */

  const shown = focusMode ? { rail: false, capture: false, aside: false } : panels;

  return (
    <div className="app">
      <Header
        layer={layer}
        onLayer={setLayer}
        theme={theme}
        onTheme={setTheme}
        onSearch={() => setPaletteOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        panels={panels}
        onTogglePanel={(panel) => {
          setFocusMode(false);
          setPanels((p) => ({ ...p, [panel]: !p[panel] }));
        }}
        focusMode={focusMode}
        onFocusMode={() => setFocusMode((f) => !f)}
      />

      <main
        className="workspace"
        data-rail={shown.rail ? "shown" : "hidden"}
        data-aside={shown.aside ? "shown" : "hidden"}
      >
        {shown.rail && (
          <ProtocolRail
            protocols={visibleProtocols}
            selected={protocol}
            category={category}
            onCategory={setCategory}
            onSelect={selectProtocol}
            onSelectStep={selectStep}
            currentStep={currentStep}
            playing={playback.playing}
          />
        )}

        <div className="stage" data-capture={shown.capture ? "shown" : "hidden"}>
          <section className="panel" aria-label="Diagram">
            <div className="view-switch">
              <button
                type="button"
                className="chip"
                aria-pressed={view === "iso"}
                onClick={() => setView("iso")}
              >
                <CubeIcon size={12} />
                3D
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={view === "network"}
                onClick={() => setView("network")}
              >
                <LayersIcon size={12} />
                Network
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={view === "sequence"}
                onClick={() => setView("sequence")}
              >
                <SequenceIcon size={12} />
                Sequence
              </button>
            </div>

            {view === "iso" ? (
              <div className="diagram-body">
                <IsometricDiagram
                  protocol={protocol}
                  flight={flight}
                  lastPacket={currentPacket}
                />
              </div>
            ) : view === "network" ? (
              <div className="diagram-body">
                <NetworkDiagram
                  protocol={protocol}
                  flight={flight}
                  lastPacket={currentPacket}
                />
              </div>
            ) : (
              <SequenceDiagram
                protocol={protocol}
                delivered={delivered}
                flight={flight}
                currentIndex={currentIndex}
              />
            )}
          </section>

          {shown.capture && (
            <CapturePanel
              packets={protocol.packets}
              playback={playback}
              note={CAPTURE_NOTE}
              address={address}
            />
          )}
        </div>

        {shown.aside && (
          <DetailPanel
            protocol={protocol}
            stepIndex={currentStep}
            packet={currentPacket}
            packetIndex={currentIndex}
            totalPackets={protocol.packets.length}
            showStep={showStep}
            onShowOverview={() => setForceOverview(true)}
            onShowStep={() => setForceOverview(false)}
            playing={playback.playing}
            address={address}
          />
        )}
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={selectProtocol}
      />

      {shortcutsOpen && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setShortcutsOpen(false)}
        >
          <div className="palette" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
            <div className="panel-head">
              <h2 className="panel-title">Keyboard</h2>
              <button type="button" className="chip" onClick={() => setShortcutsOpen(false)}>
                Close
              </button>
            </div>
            <div className="aside-scroll">
              <dl className="spec" style={{ marginTop: 0, borderTop: "none" }}>
                {[
                  { label: "Ctrl K", value: "Search protocols" },
                  { label: "Space", value: "Play or pause the capture" },
                  { label: "→", value: "Step forward one packet" },
                  { label: "←", value: "Step back one packet" },
                  { label: "R", value: "Reset the capture" },
                  { label: "V", value: "Cycle 3D, network and sequence views" },
                  { label: "?", value: "Show this list" },
                ].map((row) => (
                  <div className="spec-row" key={row.label}>
                    <dt className="label">{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
