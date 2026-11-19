"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Packet } from "@/data/types";

/** Milliseconds a packet takes to cross the diagram at 1x. */
const FLIGHT_MS = 1100;
/** Pause held after each packet lands, so the eye can catch up. */
const DWELL_MS = 260;

export interface PlaybackState {
  /** How many packets have fully landed — also the capture table's length. */
  delivered: number;
  /** The packet currently crossing the diagram, if any. */
  flight: { packet: Packet; index: number; progress: number } | null;
  /** The packet the detail panel should describe: in flight, else the last landed. */
  currentIndex: number;
  playing: boolean;
  atEnd: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  step: () => void;
  back: () => void;
  reset: () => void;
  seekTo: (index: number) => void;
  setSpeed: (speed: number) => void;
}

/**
 * Drives the packet animation.
 *
 * Position is tracked as a single float in [0, n]: the integer part is how many
 * packets have landed, and any fraction is the one still in the air. That keeps
 * the capture table, the network map and the sequence diagram reading from one
 * number rather than trying to stay in step with each other.
 */
export function usePlayback(packets: Packet[]): PlaybackState {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const posRef = useRef(0);
  const dwellRef = useRef(0);
  const total = packets.length;

  // A new protocol means a new capture.
  useEffect(() => {
    posRef.current = 0;
    dwellRef.current = 0;
    setPos(0);
    setPlaying(false);
  }, [packets]);

  const commit = useCallback((next: number) => {
    posRef.current = next;
    setPos(next);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;

      if (dwellRef.current > 0) {
        dwellRef.current -= elapsed * speed;
      } else {
        const next = posRef.current + (elapsed * speed) / FLIGHT_MS;
        const landed = Math.floor(next) > Math.floor(posRef.current);
        if (next >= total) {
          commit(total);
          setPlaying(false);
          return;
        }
        commit(landed ? Math.floor(next) : next);
        if (landed) dwellRef.current = DWELL_MS;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, total, commit]);

  const play = useCallback(() => {
    if (posRef.current >= total) commit(0);
    dwellRef.current = 0;
    setPlaying(true);
  }, [total, commit]);

  const pause = useCallback(() => setPlaying(false), []);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, play, pause]);

  const step = useCallback(() => {
    setPlaying(false);
    commit(Math.min(total, Math.floor(posRef.current) + 1));
  }, [total, commit]);

  const back = useCallback(() => {
    setPlaying(false);
    commit(Math.max(0, Math.ceil(posRef.current) - 1));
  }, [commit]);

  const reset = useCallback(() => {
    setPlaying(false);
    dwellRef.current = 0;
    commit(0);
  }, [commit]);

  const seekTo = useCallback(
    (index: number) => {
      setPlaying(false);
      commit(Math.max(0, Math.min(total, index + 1)));
    },
    [total, commit],
  );

  const landed = Math.floor(pos);
  const fraction = pos - landed;
  // Guarded rather than indexed blindly: switching protocol re-renders with the
  // new packet list one tick before the reset effect rewinds the position.
  const inAir = fraction > 0 ? packets[landed] : undefined;
  const flight = inAir ? { packet: inAir, index: landed, progress: fraction } : null;

  return {
    delivered: landed,
    flight,
    currentIndex: flight ? flight.index : landed - 1,
    playing,
    atEnd: pos >= total && total > 0,
    speed,
    play,
    pause,
    toggle,
    step,
    back,
    reset,
    seekTo,
    setSpeed,
  };
}
