import { useEffect, useReducer, useRef } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { demoReducer, initialState, resolveStatus } from "./reducer";
import { LocalAnvilDemoDataProvider, LocalAnvilUnavailableError, MockDemoDataProvider } from "./providers";
import type { AdapterMode, DemoDataProvider, DemoFrame } from "./types";

function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-chrome backdrop-blur">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 font-display text-3xl text-graphite">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function StageColumn({
  title,
  eyebrow,
  body,
  active
}: {
  title: string;
  eyebrow: string;
  body: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-[32px] border p-6 transition-all ${
        active
          ? "border-cyan/60 bg-white shadow-glow"
          : "border-slate-200/90 bg-white/70 shadow-chrome"
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-3 font-display text-2xl text-graphite">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function formatHash(value: string | null) {
  if (!value) {
    return "Pending";
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function App() {
  const providersRef = useRef<{
    mock: DemoDataProvider;
    "local-anvil": DemoDataProvider;
  }>({
    mock: new MockDemoDataProvider(),
    "local-anvil": new LocalAnvilDemoDataProvider()
  });
  const [state, dispatch] = useReducer(demoReducer, initialState);

  const activeProvider = providersRef.current[state.adapterMode];
  const frame = state.frame;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    dispatch({ type: "set_reduced_motion", value: query.matches });
  }, []);

  useEffect(() => {
    void loadFrame(activeProvider, "initial");
  }, [activeProvider]);

  async function loadFrame(provider: DemoDataProvider, intent: "initial" | "replay") {
    dispatch({ type: "load_start" });

    try {
      const nextFrame = intent === "initial" ? await provider.load() : await provider.next();
      dispatch({ type: "load_success", frame: nextFrame, status: resolveStatus(nextFrame, intent) });
    } catch (error) {
      if (error instanceof LocalAnvilUnavailableError) {
        dispatch({
          type: "load_error",
          message: "Local Anvil adapter is scaffolded but no manifest is available yet.",
          unavailable: true
        });
        return;
      }

      dispatch({ type: "load_error", message: "Unable to load demo frame." });
    }
  }

  async function jumpTo(caseId: "no-trigger" | "triggered") {
    dispatch({ type: "load_start" });

    try {
      const nextFrame = await activeProvider.jumpTo(caseId);
      dispatch({ type: "load_success", frame: nextFrame, status: resolveStatus(nextFrame, "replay") });
    } catch (error) {
      if (error instanceof LocalAnvilUnavailableError) {
        dispatch({
          type: "load_error",
          message: "Local Anvil adapter is scaffolded but no manifest is available yet.",
          unavailable: true
        });
        return;
      }

      dispatch({ type: "load_error", message: "Unable to jump to requested demo case." });
    }
  }

  async function reset() {
    dispatch({ type: "load_start" });

    try {
      const nextFrame = await activeProvider.reset();
      dispatch({ type: "load_success", frame: nextFrame, status: "idle" });
    } catch (error) {
      if (error instanceof LocalAnvilUnavailableError) {
        dispatch({
          type: "load_error",
          message: "Local Anvil adapter is scaffolded but no manifest is available yet.",
          unavailable: true
        });
        return;
      }

      dispatch({ type: "load_error", message: "Unable to reset demo sequence." });
    }
  }

  const motionSettings = state.reducedMotion
    ? { initial: false, animate: false, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55 } };

  const chartData = frame?.chart ?? [];
  const stageDispatchActive = state.status === "triggered" || state.status === "claimed";

  return (
    <div className="min-h-screen bg-grain px-4 py-6 font-sans text-graphite sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.header
          {...motionSettings}
          className="relative overflow-hidden rounded-[40px] border border-white/60 bg-white/70 p-8 shadow-chrome backdrop-blur"
        >
          <div className="absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_top,_rgba(99,231,255,0.4),_transparent_55%)] lg:block" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-slate-500">
                Reactive Energy Oracle
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-graphite md:text-6xl">
                Energy data becomes a cross-chain action surface.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                A judge-ready single-screen demo that shows source-chain publication, Reactive threshold
                evaluation, and destination reward automation with deterministic mock data.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-graphite px-5 py-3 font-display text-sm text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan"
                  onClick={() => void loadFrame(activeProvider, "replay")}
                >
                  Replay Next Update
                </button>
                <button
                  type="button"
                  className="rounded-full border border-cyan/60 bg-cyan/10 px-5 py-3 font-display text-sm text-graphite transition hover:bg-cyan/20 focus:outline-none focus:ring-2 focus:ring-cyan"
                  onClick={() => void jumpTo("triggered")}
                >
                  Trigger Case
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 font-display text-sm text-graphite transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan"
                  onClick={() => void reset()}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[32px] border border-slate-200/90 bg-white/85 p-5 shadow-chrome">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Adapter mode</p>
                <div className="mt-4 flex gap-3">
                  {(["mock", "local-anvil"] as AdapterMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-cyan ${
                        state.adapterMode === mode
                          ? "bg-graphite text-white"
                          : "border border-slate-300 bg-white text-graphite"
                      }`}
                      onClick={() => dispatch({ type: "set_adapter_mode", adapterMode: mode })}
                    >
                      {mode === "mock" ? "Mock adapter" : "Local Anvil"}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Mock mode is deterministic for demo control. Local Anvil mode is scaffolded for read-only chain sync.
                </p>
              </div>

              <div className="rounded-[32px] border border-slate-200/90 bg-graphite p-5 text-white shadow-[0_28px_80px_rgba(16,19,27,0.32)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan/80">Current verdict</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-3xl">
                      {frame ? frame.threshold.verdictLabel : "Loading"}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {frame ? frame.threshold.summary : "Pulling the first deterministic demo frame."}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-lime">
                    {state.status.replace("_", " ")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {state.liveAdapterUnavailable ? (
          <div className="mt-6 rounded-[28px] border border-signal/40 bg-signal/10 px-5 py-4 text-sm text-signal">
            Local Anvil adapter unavailable: manifest and deployment script scaffold exists, but no live local chain manifest has been generated yet.
          </div>
        ) : null}

        {state.reducedMotion ? (
          <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/70 px-5 py-4 text-sm text-slate-600 shadow-chrome">
            Reduced motion mode enabled. Signature animation cues are minimized for accessibility.
          </div>
        ) : null}

        {state.error ? (
          <div className="mt-6 rounded-[28px] border border-signal/30 bg-white/80 px-5 py-4 text-sm text-signal shadow-chrome">
            {state.error}
          </div>
        ) : null}

        <main className="mt-6 grid gap-6">
          <motion.section
            {...motionSettings}
            className="grid gap-4 lg:grid-cols-3"
            aria-label="Reactive execution stage"
          >
            <StageColumn
              eyebrow="Source"
              title="Source Chain"
              body={frame ? `${frame.snapshot.metricTypeLabel} v${frame.snapshot.version} published to ${frame.sourceTx.networkLabel}.` : "Loading source chain stage."}
              active={Boolean(frame)}
            />
            <StageColumn
              eyebrow="Reactive"
              title="Reactive Engine"
              body={frame ? frame.reactiveDecision.detail : "Reactive threshold stage pending."}
              active={Boolean(frame)}
            />
            <StageColumn
              eyebrow="Destination"
              title="Destination Chain"
              body={
                frame
                  ? frame.threshold.dispatched
                    ? `Mirrored feed advanced to v${frame.destinationTx.mirrorVersion} and reward status is visible.`
                    : "Destination contract stayed idle because no callback was dispatched."
                  : "Destination state pending."
              }
              active={stageDispatchActive}
            />
          </motion.section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Current value"
                value={frame ? `${frame.snapshot.value} ${frame.snapshot.unit}` : "--"}
                hint="Latest source-chain energy metric."
              />
              <StatCard
                label="Forecast value"
                value={frame ? `${frame.snapshot.forecastValue} ${frame.snapshot.unit}` : "--"}
                hint="Short-horizon projection used by Reactive."
              />
              <StatCard
                label="Threshold"
                value={frame ? `${frame.threshold.configured} ${frame.snapshot.unit}` : "--"}
                hint="Destination dispatch rule."
              />
              <StatCard
                label="Reward status"
                value={frame ? frame.rewardState.statusLabel : "--"}
                hint="Visible destination action outcome."
              />
            </div>

            <div className="rounded-[32px] border border-slate-200/90 bg-white/80 p-6 shadow-chrome">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Verification bundle</p>
                  <h2 className="mt-3 font-display text-2xl text-graphite">
                    Version {frame?.snapshot.version ?? "--"} with signed payload proof
                  </h2>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-graphite transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan"
                  onClick={() =>
                    dispatch({ type: "toggle_proof_drawer", open: !state.proofDrawerOpen })
                  }
                >
                  {state.proofDrawerOpen ? "Hide Proof" : "View Proof"}
                </button>
              </div>

              <dl className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Payload hash</dt>
                  <dd className="mt-2 break-all font-mono text-xs text-graphite">
                    {frame?.snapshot.payloadHash ?? "--"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Signature digest</dt>
                  <dd className="mt-2 break-all font-mono text-xs text-graphite">
                    {frame?.snapshot.signatureDigest ?? "--"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Observed at</dt>
                  <dd className="mt-2 text-graphite">{frame?.snapshot.observedAtLabel ?? "--"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Expires at</dt>
                  <dd className="mt-2 text-graphite">{frame?.snapshot.expiresAtLabel ?? "--"}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-slate-200/90 bg-white/80 p-6 shadow-chrome">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Threshold monitor</p>
                  <h2 className="mt-3 font-display text-2xl text-graphite">Energy trend with dispatch line</h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  {frame?.reactiveDecision.latencyLabel ?? "pending"}
                </div>
              </div>

              <div className="mt-8 h-[280px] overflow-hidden rounded-[24px] border border-slate-200 bg-chrome p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="valueFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#63e7ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#63e7ff" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="forecastFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#d3ff6b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#d3ff6b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" vertical={false} />
                    <XAxis
                      dataKey="observedAtLabel"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <ReferenceLine
                      y={frame?.threshold.configured ?? 95}
                      stroke="#ff8c5a"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#13a7be"
                      strokeWidth={2}
                      fill="url(#valueFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="forecastValue"
                      stroke="#87bf00"
                      strokeWidth={2}
                      fill="url(#forecastFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200/90 bg-white/80 p-6 shadow-chrome">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Execution timeline</p>
              <h2 className="mt-3 font-display text-2xl text-graphite">From event to payout visibility</h2>
              <ol className="mt-6 space-y-4">
                {(frame?.timeline ?? []).map((entry) => (
                  <li key={entry.id} className="flex gap-4">
                    <span
                      className={`mt-1 h-3 w-3 rounded-full ${
                        entry.state === "completed"
                          ? "bg-cyan"
                          : entry.state === "skipped"
                            ? "bg-slate-300"
                            : "bg-lime"
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-display text-lg text-graphite">{entry.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{entry.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {frame?.rewardState.credited && !frame.rewardState.claimed ? (
                <button
                  type="button"
                  className="mt-6 rounded-full bg-graphite px-5 py-3 font-display text-sm text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan"
                  onClick={() => dispatch({ type: "claim_reward" })}
                >
                  Claim Reward
                </button>
              ) : null}
            </div>
          </section>

          {state.proofDrawerOpen && frame ? (
            <section className="rounded-[32px] border border-slate-200/90 bg-white/85 p-6 shadow-chrome" aria-label="Proof drawer">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Proof drawer</p>
                  <h2 className="mt-3 font-display text-2xl text-graphite">Traceable delivery metadata</h2>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-graphite transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan"
                  onClick={() => dispatch({ type: "toggle_proof_drawer", open: false })}
                >
                  Close
                </button>
              </div>
              <div className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Source tx</p>
                  <p className="mt-2 font-mono text-xs text-graphite">{frame.proof.sourceTxHash}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Destination tx</p>
                  <p className="mt-2 font-mono text-xs text-graphite">
                    {frame.proof.destinationTxHash ?? "No destination callback"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Delivery id</p>
                  <p className="mt-2 font-mono text-xs text-graphite">{frame.proof.deliveryId ?? "Not generated"}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Source label</p>
                  <p className="mt-2 text-graphite">{frame.snapshot.sourceLabel}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Mirror version</p>
                  <p className="mt-2 text-graphite">{frame.destinationTx.mirrorVersion ?? "No mirror write"}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Reward recipient</p>
                  <p className="mt-2 text-graphite">{frame.rewardState.recipient}</p>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="rounded-[32px] border border-slate-200/90 bg-white/70 p-6 shadow-chrome">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <p>
                Source tx {formatHash(frame?.sourceTx.hash ?? null)} {"->"} Reactive trigger{" "}
                {frame?.reactiveDecision.triggerValue ?? "--"} {"->"} Destination tx{" "}
                {formatHash(frame?.destinationTx.hash ?? null)}
              </p>
              <p className="font-mono uppercase tracking-[0.24em]">
                {frame ? `v${frame.snapshot.version} / ${frame.snapshot.metricType}` : "booting"}
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
