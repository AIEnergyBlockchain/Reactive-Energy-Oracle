export type AdapterMode = "mock" | "local-anvil";
export type DemoCaseId = "no-trigger" | "triggered";
export type UIState = "idle" | "loading" | "replaying" | "no_trigger" | "triggered" | "claimed" | "error";

export interface DemoPoint {
  version: number;
  value: number;
  forecastValue: number;
  triggerValue: number;
  observedAtLabel: string;
}

export interface DemoSnapshot {
  feedId: string;
  metricType: string;
  metricTypeLabel: string;
  sourceId: string;
  sourceLabel: string;
  unit: string;
  observedAt: number;
  observedAtLabel: string;
  expiresAt: number;
  expiresAtLabel: string;
  version: number;
  value: number;
  forecastValue: number;
  triggerValue: number;
  payloadHash: string;
  signatureDigest: string;
}

export interface TimelineEntry {
  id: string;
  label: string;
  detail: string;
  state: "completed" | "pending" | "skipped";
}

export interface DemoFrame {
  id: string;
  caseId: DemoCaseId;
  snapshot: DemoSnapshot;
  threshold: {
    configured: number;
    dispatched: boolean;
    verdictLabel: string;
    summary: string;
  };
  sourceTx: {
    hash: string;
    blockLabel: string;
    networkLabel: string;
  };
  reactiveDecision: {
    triggerValue: number;
    dispatched: boolean;
    latencyLabel: string;
    detail: string;
  };
  destinationTx: {
    hash: string | null;
    networkLabel: string;
    mirrorVersion: number | null;
  };
  rewardState: {
    recipient: string;
    amountLabel: string;
    credited: boolean;
    claimed: boolean;
    statusLabel: string;
  };
  timeline: TimelineEntry[];
  chart: DemoPoint[];
  proof: {
    sourceTxHash: string;
    destinationTxHash: string | null;
    deliveryId: string | null;
  };
}

export interface DemoDataProvider {
  readonly mode: AdapterMode;
  load(): Promise<DemoFrame>;
  next(): Promise<DemoFrame>;
  jumpTo(caseId: DemoCaseId): Promise<DemoFrame>;
  reset(): Promise<DemoFrame>;
}

export interface DemoAppState {
  status: UIState;
  adapterMode: AdapterMode;
  frame: DemoFrame | null;
  error: string | null;
  proofDrawerOpen: boolean;
  liveAdapterUnavailable: boolean;
  reducedMotion: boolean;
}
