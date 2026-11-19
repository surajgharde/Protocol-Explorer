"use client";

import { useEffect, useRef } from "react";
import type { Protocol, ProtocolCategory } from "@/data/types";
import { categories, countByCategory } from "@/data";
import { CheckIcon, ChevronRight } from "./Icons";

export function ProtocolRail({
  protocols,
  selected,
  category,
  onCategory,
  onSelect,
  onSelectStep,
  currentStep,
  playing,
}: {
  protocols: Protocol[];
  selected: Protocol;
  category: ProtocolCategory | "all";
  onCategory: (id: ProtocolCategory | "all") => void;
  onSelect: (id: string) => void;
  onSelectStep: (step: number) => void;
  currentStep: number;
  playing: boolean;
}) {
  const selectedRef = useRef<HTMLLIElement>(null);

  // Keep the open protocol in view when it changes from the palette or a URL.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected.id]);

  return (
    <section className="panel" aria-label="Protocol catalogue">
      <div className="panel-head">
        <h2 className="panel-title">Internet Protocols</h2>
      </div>

      <div className="rail-filters">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="chip"
            aria-pressed={category === cat.id}
            onClick={() => onCategory(cat.id)}
          >
            {cat.label}
            <span className="count">{countByCategory(cat.id)}</span>
          </button>
        ))}
      </div>

      <ul className="rail-list" style={{ listStyle: "none", margin: 0 }}>
        {protocols.map((protocol) => {
          const isSelected = protocol.id === selected.id;
          return (
            <li
              key={protocol.id}
              ref={isSelected ? selectedRef : undefined}
              className={`proto${isSelected ? " is-selected" : ""}${
                isSelected && playing ? " is-playing" : ""
              }`}
            >
              <button
                type="button"
                className="proto-btn"
                aria-expanded={isSelected}
                onClick={() => onSelect(protocol.id)}
              >
                <span className="proto-dot" />
                <span className="proto-text">
                  <span className="proto-name">{protocol.name}</span>
                  <span className="proto-tag">{protocol.tagline}</span>
                </span>
                <span className="proto-caret">
                  <ChevronRight size={13} />
                </span>
              </button>

              {isSelected && (
                <ol className="proto-steps">
                  {protocol.steps.map((step, i) => {
                    const done = i < currentStep;
                    const current = i === currentStep;
                    return (
                      <li key={step.title}>
                        <button
                          type="button"
                          className={`step-row${done ? " is-done" : ""}${
                            current ? " is-current" : ""
                          }`}
                          onClick={() => onSelectStep(i)}
                        >
                          <span className="step-num">
                            {done ? <CheckIcon size={10} /> : i + 1}
                          </span>
                          <span>
                            <span className="step-title">{step.title}</span>
                            <span className="step-sum">{step.summary}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}

        {protocols.length === 0 && (
          <li className="rail-empty">
            No protocol in this catalogue sits on that layer.
          </li>
        )}
      </ul>
    </section>
  );
}
