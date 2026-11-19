"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { protocols } from "@/data";
import { layerNames } from "@/data";

export function CommandPalette({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return protocols;

    /**
     * Searching "tcp" should surface TCP itself before the dozen protocols that
     * merely mention it as their transport, so score the name ahead of the
     * supporting fields rather than treating every match equally.
     */
    const score = (p: (typeof protocols)[number]) => {
      const name = p.name.toLowerCase();
      if (name === q) return 0;
      if (name.startsWith(q)) return 1;
      if (name.includes(q)) return 2;
      if (p.fullName.toLowerCase().includes(q)) return 3;
      if (p.tagline.toLowerCase().includes(q)) return 4;
      if ([p.category, p.rfc, p.transport, p.port].join(" ").toLowerCase().includes(q)) return 5;
      return Infinity;
    };

    return protocols
      .map((p) => ({ p, rank: score(p) }))
      .filter((hit) => hit.rank !== Infinity)
      .sort((a, b) => a.rank - b.rank)
      .map((hit) => hit.p);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    input.current?.focus();
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const commit = (index: number) => {
    const hit = results[index];
    if (!hit) return;
    onSelect(hit.id);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search protocols">
        <input
          ref={input}
          className="palette-input"
          placeholder="Search protocols, ports, RFCs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />

        {results.length === 0 ? (
          <p className="palette-empty">Nothing matches “{query}”.</p>
        ) : (
          <ul className="palette-list" ref={list}>
            {results.map((protocol, i) => (
              <li key={protocol.id}>
                <button
                  type="button"
                  className={`palette-row${i === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(i)}
                >
                  <span className="palette-name">{protocol.name}</span>
                  <span className="palette-tag">{protocol.tagline}</span>
                  <span className="palette-layer">
                    L{protocol.layer} · {layerNames[protocol.layer]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="palette-foot">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
