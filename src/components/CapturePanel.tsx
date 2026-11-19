"use client";

import { useEffect, useRef } from "react";
import type { Packet } from "@/data/types";
import { formatTime, kindColor, packetKindOrder, packetKinds } from "@/lib/packetKinds";
import type { PlaybackState } from "@/lib/usePlayback";
import { BackIcon, PauseIcon, PlayIcon, ResetIcon, StepIcon } from "./Icons";

const SPEEDS = [0.5, 1, 1.5, 2, 4];

export function CapturePanel({
  packets,
  playback,
  note,
  address,
}: {
  packets: Packet[];
  playback: PlaybackState;
  note: string;
  /** Node id to the address shown in the Source and Destination columns. */
  address: (id: string) => string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const { delivered, currentIndex, playing } = playback;

  /** Families actually present in this capture, so the legend stays honest. */
  const presentKinds = packetKindOrder.filter((kind) =>
    packets.some((p) => p.kind === kind),
  );

  // Keep the newest row in view as the capture fills.
  useEffect(() => {
    const row = scroller.current?.querySelector<HTMLElement>(".is-current");
    row?.scrollIntoView({ block: "nearest" });
  }, [currentIndex]);

  return (
    <section className="panel" aria-label="Packet capture">
      <div className="panel-head">
        <h2 className="panel-title">Packet Flow</h2>

        <div className="legend">
          {presentKinds.map((kind) => (
            <span className="legend-item" key={kind}>
              <span className="legend-dot" style={{ background: kindColor(kind) }} />
              {packetKinds[kind].label}
            </span>
          ))}
          <span className="legend-item" style={{ fontStyle: "italic" }}>
            {note}
          </span>
        </div>

        <div className="controls">
          <select
            className="speed"
            value={playback.speed}
            aria-label="Playback speed"
            onChange={(e) => playback.setSpeed(Number(e.target.value))}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn"
            onClick={playback.back}
            disabled={delivered === 0}
            aria-label="Previous packet"
          >
            <BackIcon size={12} />
          </button>

          <button type="button" className="btn btn-primary" onClick={playback.toggle}>
            {playing ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
            {playing ? "Pause" : playback.atEnd ? "Replay" : "Play"}
          </button>

          <button
            type="button"
            className="btn"
            onClick={playback.step}
            disabled={playback.atEnd}
          >
            <StepIcon size={12} />
            Step
          </button>

          <button type="button" className="btn" onClick={playback.reset} disabled={delivered === 0}>
            <ResetIcon size={12} />
            Reset
          </button>
        </div>
      </div>

      <div className="capture-scroll" ref={scroller}>
        {delivered === 0 ? (
          <p className="capture-empty">
            Press Play to run the capture, or Step to advance one packet at a time.
          </p>
        ) : (
          <table className="capture">
            <thead>
              <tr>
                <th className="col-no">No.</th>
                <th>Time</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Protocol</th>
                <th className="col-info">Info</th>
                <th className="col-size">Size</th>
              </tr>
            </thead>
            <tbody>
              {packets.slice(0, delivered).map((packet, i) => (
                <tr
                  key={i}
                  className={i === currentIndex ? "is-current" : undefined}
                  onClick={() => playback.seekTo(i)}
                >
                  <td className="col-no">
                    <span className="seq-badge" style={{ background: kindColor(packet.kind) }}>
                      {i + 1}
                    </span>
                  </td>
                  <td>{formatTime(packet.t)}</td>
                  <td>{address(packet.from)}</td>
                  <td>{address(packet.to)}</td>
                  <td>{packet.protocol}</td>
                  <td className="col-info">{packet.info}</td>
                  <td className="col-size">{packet.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
