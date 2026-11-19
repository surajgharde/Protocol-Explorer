"use client";

import type { Packet, Protocol } from "@/data/types";
import { formatTime, kindColor } from "@/lib/packetKinds";
import { ChevronLeft } from "./Icons";

function Spec({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="spec">
      {rows.map((row) => (
        <div className="spec-row" key={row.label}>
          <dt className="label">{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailPanel({
  protocol,
  stepIndex,
  packet,
  packetIndex,
  totalPackets,
  showStep,
  onShowOverview,
  onShowStep,
  playing,
  address,
}: {
  protocol: Protocol;
  stepIndex: number;
  packet: Packet | null;
  packetIndex: number;
  totalPackets: number;
  showStep: boolean;
  onShowOverview: () => void;
  onShowStep: () => void;
  playing: boolean;
  address: (id: string) => string;
}) {
  const step = protocol.steps[stepIndex];

  if (showStep && step) {
    return (
      <section className="panel" aria-label="Step details">
        <div className="panel-head">
          <h2 className="panel-title">Step Details</h2>
          <button type="button" className="chip" onClick={onShowOverview}>
            <ChevronLeft size={11} />
            Overview
          </button>
        </div>

        <div className="aside-scroll">
          <span className="step-eyebrow">
            Step {stepIndex + 1} of {protocol.steps.length}
          </span>
          <h3 className="aside-step-title">{step.title}</h3>
          <p className="aside-full">{step.summary}</p>
          <p className="prose">{step.detail}</p>

          {packet && (
            <div className="packet-card" style={{ borderLeftColor: kindColor(packet.kind) }}>
              <div className="packet-card-head">
                <span className="packet-tag" style={{ background: kindColor(packet.kind) }}>
                  {packet.protocol}
                </span>
                <span className="packet-route">
                  {address(packet.from)} → {address(packet.to)}
                </span>
              </div>
              <p className="packet-payload">{packet.payload ?? packet.info}</p>
              <p className="packet-meta">
                Packet {packetIndex + 1} of {totalPackets} · {formatTime(packet.t)} · {packet.size}
              </p>
            </div>
          )}

          {step.facts && <Spec rows={step.facts} />}
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-label="Protocol overview">
      <div className="panel-head">
        <h2 className="panel-title">Protocol Overview</h2>
        {totalPackets > 0 && (
          <button type="button" className="chip" onClick={onShowStep}>
            Steps
          </button>
        )}
      </div>

      <div className="aside-scroll">
        <div className="step-head">
          <div>
            <h3 className="aside-name">{protocol.name}</h3>
            <p className="aside-full">{protocol.fullName}</p>
          </div>
          <span className={`status${playing ? " is-live" : ""}`}>
            <span className="status-dot" />
            {playing ? "Live" : "Ready"}
          </span>
        </div>

        <p className="prose">{protocol.description}</p>

        <Spec
          rows={[
            { label: "Layer", value: protocol.layerName },
            { label: "Port", value: protocol.port },
            { label: "Transport", value: protocol.transport },
            { label: "Data format", value: protocol.format },
            ...(protocol.extra ?? []),
            { label: "Defined in", value: protocol.rfc },
          ]}
        />
      </div>
    </section>
  );
}
