import type { DemoFrame, DemoPoint } from "./types";

const THRESHOLD = 95;
const REWARD_RECIPIENT = "0x31f8...9e3a";
const REWARD_AMOUNT = "1.00 REWARD";

const basePoints: DemoPoint[] = [
  { version: 1, value: 82, forecastValue: 91, triggerValue: 91, observedAtLabel: "08:00 UTC" },
  { version: 2, value: 86, forecastValue: 97, triggerValue: 97, observedAtLabel: "09:00 UTC" },
  { version: 3, value: 79, forecastValue: 84, triggerValue: 84, observedAtLabel: "10:00 UTC" },
  { version: 4, value: 93, forecastValue: 101, triggerValue: 101, observedAtLabel: "11:00 UTC" }
];

function chartUntil(version: number) {
  return basePoints.filter((point) => point.version <= version);
}

function buildTimeline(dispatched: boolean, claimed = false): DemoFrame["timeline"] {
  return [
    {
      id: "feed-update",
      label: "Feed Updated",
      detail: "Source chain accepted the new energy snapshot payload.",
      state: "completed"
    },
    {
      id: "threshold",
      label: "Threshold Evaluated",
      detail: dispatched ? "Reactive matched the threshold and armed callback payload." : "Reactive observed the event and skipped callback dispatch.",
      state: "completed"
    },
    {
      id: "callback",
      label: "Callback Dispatched",
      detail: dispatched ? "Destination callback emitted with mirrored payload metadata." : "No destination callback because the threshold was below 95.",
      state: dispatched ? "completed" : "skipped"
    },
    {
      id: "reward",
      label: claimed ? "Reward Claimed" : "Reward Credited",
      detail: dispatched
        ? claimed
          ? "Demo reward moved from credited to claimed."
          : "Destination vault mirrored the feed and credited reward."
        : "Reward path stayed inactive because no payout was triggered.",
      state: dispatched ? "completed" : "skipped"
    }
  ];
}

export const demoFrames: DemoFrame[] = [
  {
    id: "frame-1",
    caseId: "no-trigger",
    snapshot: {
      feedId: "energy-price-demo",
      metricType: "price",
      metricTypeLabel: "Grid Price Feed",
      sourceId: "0x4809...9c80",
      sourceLabel: "grid-demo-v1",
      unit: "USD/MWh",
      observedAt: 1772870400,
      observedAtLabel: "2026-03-07 08:00 UTC",
      expiresAt: 1772874000,
      expiresAtLabel: "2026-03-07 09:00 UTC",
      version: 1,
      value: 82,
      forecastValue: 91,
      triggerValue: 91,
      payloadHash: "0xefcb859259e67c71f74664dda665ab7fb40c68c131272c7f5b7ab5fedd58ffc8",
      signatureDigest: "0x4bcbf90b35d91460741af01fc697db514118c208e3cf1ab6c64ac3568aeb65c2"
    },
    threshold: {
      configured: THRESHOLD,
      dispatched: false,
      verdictLabel: "Below threshold",
      summary: "Forecast stayed below the dispatch threshold, so the destination chain did not execute."
    },
    sourceTx: {
      hash: "0xa18c...1001",
      blockLabel: "#348901",
      networkLabel: "Source Chain"
    },
    reactiveDecision: {
      triggerValue: 91,
      dispatched: false,
      latencyLabel: "420 ms",
      detail: "Reactive observed the event, validated the feed, and stopped before callback dispatch."
    },
    destinationTx: {
      hash: null,
      networkLabel: "Destination Chain",
      mirrorVersion: null
    },
    rewardState: {
      recipient: REWARD_RECIPIENT,
      amountLabel: REWARD_AMOUNT,
      credited: false,
      claimed: false,
      statusLabel: "No payout"
    },
    timeline: buildTimeline(false),
    chart: chartUntil(1),
    proof: {
      sourceTxHash: "0xa18c9cacef11001",
      destinationTxHash: null,
      deliveryId: null
    }
  },
  {
    id: "frame-2",
    caseId: "triggered",
    snapshot: {
      feedId: "energy-price-demo",
      metricType: "price",
      metricTypeLabel: "Grid Price Feed",
      sourceId: "0x4809...9c80",
      sourceLabel: "grid-demo-v1",
      unit: "USD/MWh",
      observedAt: 1772874000,
      observedAtLabel: "2026-03-07 09:00 UTC",
      expiresAt: 1772877600,
      expiresAtLabel: "2026-03-07 10:00 UTC",
      version: 2,
      value: 86,
      forecastValue: 97,
      triggerValue: 97,
      payloadHash: "0x99818cd583a9ce603f41a80a4181111b3564f21f932b97fb65d35d30b4a94b80",
      signatureDigest: "0x246f4d4769cb6ee73ff8637261c31a9a7df698e691bc2838a6820dafde74689b"
    },
    threshold: {
      configured: THRESHOLD,
      dispatched: true,
      verdictLabel: "Threshold hit",
      summary: "Forecast exceeded the dispatch threshold and Reactive emitted a destination callback."
    },
    sourceTx: {
      hash: "0xb93f...2002",
      blockLabel: "#348902",
      networkLabel: "Source Chain"
    },
    reactiveDecision: {
      triggerValue: 97,
      dispatched: true,
      latencyLabel: "190 ms",
      detail: "Reactive packaged the payload for the destination vault and passed the mirror update plus reward signal."
    },
    destinationTx: {
      hash: "0xd0aa...7002",
      networkLabel: "Destination Chain",
      mirrorVersion: 2
    },
    rewardState: {
      recipient: REWARD_RECIPIENT,
      amountLabel: REWARD_AMOUNT,
      credited: true,
      claimed: false,
      statusLabel: "Reward credited"
    },
    timeline: buildTimeline(true),
    chart: chartUntil(2),
    proof: {
      sourceTxHash: "0xb93ff8ade42002",
      destinationTxHash: "0xd0aa7b5ee47002",
      deliveryId: "0x2d7b...c91f"
    }
  },
  {
    id: "frame-3",
    caseId: "no-trigger",
    snapshot: {
      feedId: "energy-price-demo",
      metricType: "price",
      metricTypeLabel: "Grid Price Feed",
      sourceId: "0x4809...9c80",
      sourceLabel: "grid-demo-v1",
      unit: "USD/MWh",
      observedAt: 1772877600,
      observedAtLabel: "2026-03-07 10:00 UTC",
      expiresAt: 1772881200,
      expiresAtLabel: "2026-03-07 11:00 UTC",
      version: 3,
      value: 79,
      forecastValue: 84,
      triggerValue: 84,
      payloadHash: "0x3971e7329dca149554f666dc009f2751985c325bc774ff4a7e6f7b1f46c4f935",
      signatureDigest: "0xd706049dd037e625c2c9f58607056d746cc7407c8b96eb189e53e525f9a13055"
    },
    threshold: {
      configured: THRESHOLD,
      dispatched: false,
      verdictLabel: "Below threshold",
      summary: "The system recovered below the trigger line and held the destination vault steady."
    },
    sourceTx: {
      hash: "0xcab0...3003",
      blockLabel: "#348903",
      networkLabel: "Source Chain"
    },
    reactiveDecision: {
      triggerValue: 84,
      dispatched: false,
      latencyLabel: "410 ms",
      detail: "Reactive ignored the callback path because the payload stayed inside the safe operating band."
    },
    destinationTx: {
      hash: null,
      networkLabel: "Destination Chain",
      mirrorVersion: null
    },
    rewardState: {
      recipient: REWARD_RECIPIENT,
      amountLabel: REWARD_AMOUNT,
      credited: false,
      claimed: false,
      statusLabel: "No payout"
    },
    timeline: buildTimeline(false),
    chart: chartUntil(3),
    proof: {
      sourceTxHash: "0xcab0f7be403003",
      destinationTxHash: null,
      deliveryId: null
    }
  },
  {
    id: "frame-4",
    caseId: "triggered",
    snapshot: {
      feedId: "energy-price-demo",
      metricType: "price",
      metricTypeLabel: "Grid Price Feed",
      sourceId: "0x4809...9c80",
      sourceLabel: "grid-demo-v1",
      unit: "USD/MWh",
      observedAt: 1772881200,
      observedAtLabel: "2026-03-07 11:00 UTC",
      expiresAt: 1772884800,
      expiresAtLabel: "2026-03-07 12:00 UTC",
      version: 4,
      value: 93,
      forecastValue: 101,
      triggerValue: 101,
      payloadHash: "0x6f3da3064a6282906454e505c15f9d3f6fe0f5c31c537a7b7514536187068d8f",
      signatureDigest: "0xcaee1d64cec1c58b95dac611d1621a98aa24d2ab1248409ef666fa6b00a55951"
    },
    threshold: {
      configured: THRESHOLD,
      dispatched: true,
      verdictLabel: "Threshold hit",
      summary: "A second surge triggered a follow-up callback and refreshed the mirrored destination feed."
    },
    sourceTx: {
      hash: "0xdd2b...4004",
      blockLabel: "#348904",
      networkLabel: "Source Chain"
    },
    reactiveDecision: {
      triggerValue: 101,
      dispatched: true,
      latencyLabel: "180 ms",
      detail: "Reactive dispatched the callback, updated the destination mirror, and re-armed reward credit."
    },
    destinationTx: {
      hash: "0xe8cf...7004",
      networkLabel: "Destination Chain",
      mirrorVersion: 4
    },
    rewardState: {
      recipient: REWARD_RECIPIENT,
      amountLabel: REWARD_AMOUNT,
      credited: true,
      claimed: false,
      statusLabel: "Reward credited"
    },
    timeline: buildTimeline(true),
    chart: chartUntil(4),
    proof: {
      sourceTxHash: "0xdd2bc2f4f24004",
      destinationTxHash: "0xe8cf112ac97004",
      deliveryId: "0xa52e...44d2"
    }
  }
];

export function cloneFrame(frame: DemoFrame): DemoFrame {
  return JSON.parse(JSON.stringify(frame)) as DemoFrame;
}

export function claimFrame(frame: DemoFrame): DemoFrame {
  const nextFrame = cloneFrame(frame);
  nextFrame.rewardState.claimed = true;
  nextFrame.rewardState.statusLabel = "Reward claimed";
  nextFrame.timeline = buildTimeline(frame.threshold.dispatched, true);
  return nextFrame;
}
