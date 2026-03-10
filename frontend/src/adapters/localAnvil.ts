import {
  createPublicClient,
  encodeAbiParameters,
  formatEther,
  http,
  keccak256,
  toHex
} from "viem";
import type { DemoFrame } from "../types";
import type { LocalChainManifest } from "./localManifest";

type Address = `0x${string}`;

const FEED_ID = keccak256(toHex("energy-price-demo"));
const METRIC_TYPE = keccak256(toHex("price"));
const UNIT = "USD/MWh";

const sourceFeedEmitterAbi = [
  {
    type: "function",
    name: "getLatestFeed",
    stateMutability: "view",
    inputs: [{ name: "feedId", type: "bytes32" }],
    outputs: [
      { name: "metricType", type: "bytes32" },
      { name: "sourceId", type: "bytes32" },
      { name: "observedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "version", type: "uint64" },
      { name: "triggerValue", type: "uint256" },
      { name: "value", type: "uint256" },
      { name: "forecastValue", type: "uint256" },
      { name: "payloadHash", type: "bytes32" },
      { name: "signatureDigest", type: "bytes32" }
    ]
  }
] as const;

const destinationVaultAbi = [
  {
    type: "function",
    name: "getMirroredFeed",
    stateMutability: "view",
    inputs: [{ name: "feedId", type: "bytes32" }],
    outputs: [
      { name: "metricType", type: "bytes32" },
      { name: "sourceId", type: "bytes32" },
      { name: "observedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "version", type: "uint64" },
      { name: "updatedAt", type: "uint64" },
      { name: "value", type: "uint256" },
      { name: "forecastValue", type: "uint256" },
      { name: "triggerValue", type: "uint256" },
      { name: "originTxHash", type: "uint256" },
      { name: "payloadHash", type: "bytes32" },
      { name: "signatureDigest", type: "bytes32" }
    ]
  },
  {
    type: "function",
    name: "rewardRecipient",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "rewardAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "claimableRewards",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

function createChain(id: number, name: string, rpcUrl: string) {
  return {
    id,
    name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } }
  };
}

function formatTimestamp(seconds: bigint) {
  if (seconds === 0n) {
    return "Not available";
  }
  const millis = Number(seconds) * 1000;
  const iso = new Date(millis).toISOString().replace("T", " ");
  return `${iso.slice(0, 16)} UTC`;
}

function buildTimeline(dispatched: boolean, credited: boolean): DemoFrame["timeline"] {
  return [
    {
      id: "feed-update",
      label: "Feed Updated",
      detail: "Latest feed update was read from the local source chain.",
      state: "completed"
    },
    {
      id: "threshold",
      label: "Threshold Evaluated",
      detail: dispatched
        ? "Reactive threshold evaluation indicates the dispatch rule was hit."
        : "Feed remains below threshold; no dispatch required.",
      state: "completed"
    },
    {
      id: "callback",
      label: "Callback Dispatched",
      detail: dispatched
        ? "Destination mirror was updated based on the incoming callback payload."
        : "Destination callback was not fired.",
      state: dispatched ? "completed" : "skipped"
    },
    {
      id: "reward",
      label: credited ? "Reward Credited" : "Reward Pending",
      detail: credited
        ? "Destination vault credited the configured reward recipient."
        : "Reward credit not visible in the vault yet.",
      state: dispatched ? "completed" : "skipped"
    }
  ];
}

export async function loadLocalChainFrame(manifest: LocalChainManifest): Promise<DemoFrame> {
  const sourceChain = createChain(
    manifest.sourceChain.chainId,
    manifest.sourceChain.name,
    manifest.sourceChain.rpcUrl
  );
  const destinationChain = createChain(
    manifest.destinationChain.chainId,
    manifest.destinationChain.name,
    manifest.destinationChain.rpcUrl
  );

  const sourceClient = createPublicClient({
    chain: sourceChain,
    transport: http(manifest.sourceChain.rpcUrl)
  });
  const destinationClient = createPublicClient({
    chain: destinationChain,
    transport: http(manifest.destinationChain.rpcUrl)
  });

  const latest = await sourceClient.readContract({
    address: manifest.sourceChain.sourceFeedEmitter as Address,
    abi: sourceFeedEmitterAbi,
    functionName: "getLatestFeed",
    args: [FEED_ID]
  });

  const mirrored = await destinationClient.readContract({
    address: manifest.destinationChain.destinationActionVault as Address,
    abi: destinationVaultAbi,
    functionName: "getMirroredFeed",
    args: [FEED_ID]
  });

  const rewardRecipient = (await destinationClient.readContract({
    address: manifest.destinationChain.destinationActionVault as Address,
    abi: destinationVaultAbi,
    functionName: "rewardRecipient"
  })) as Address;

  const rewardAmount = (await destinationClient.readContract({
    address: manifest.destinationChain.destinationActionVault as Address,
    abi: destinationVaultAbi,
    functionName: "rewardAmount"
  })) as bigint;

  const claimableRewards = (await destinationClient.readContract({
    address: manifest.destinationChain.destinationActionVault as Address,
    abi: destinationVaultAbi,
    functionName: "claimableRewards",
    args: [rewardRecipient]
  })) as bigint;

  const [
    metricType,
    sourceId,
    observedAt,
    expiresAt,
    version,
    triggerValue,
    value,
    forecastValue,
    payloadHash,
    signatureDigest
  ] = latest as readonly [
    `0x${string}`,
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    `0x${string}`,
    `0x${string}`
  ];

  const [
    ,
    ,
    ,
    ,
    mirroredVersion,
    ,
    mirroredValue,
    mirroredForecastValue,
    mirroredTriggerValue,
    originTxHash,
    mirroredPayloadHash
  ] = mirrored as readonly [
    `0x${string}`,
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    `0x${string}`,
    `0x${string}`
  ];

  if (version === 0n) {
    throw new Error("LOCAL_ANVIL_NO_FEED");
  }

  const hasMirror = mirroredVersion !== 0n;
  const dispatched = hasMirror || triggerValue >= BigInt(manifest.reactive.threshold);
  const credited = claimableRewards > 0n;

  const deliveryId = hasMirror
    ? keccak256(
        encodeAbiParameters(
          [
            { name: "feedId", type: "bytes32" },
            { name: "version", type: "uint64" },
            { name: "payloadHash", type: "bytes32" },
            { name: "originTxHash", type: "uint256" }
          ],
          [FEED_ID, mirroredVersion, mirroredPayloadHash, originTxHash]
        )
      )
    : null;

  return {
    id: `local-${Number(version)}`,
    caseId: dispatched ? "triggered" : "no-trigger",
    snapshot: {
      feedId: "energy-price-demo",
      metricType: metricType === METRIC_TYPE ? "price" : metricType,
      metricTypeLabel: "Grid Price Feed",
      sourceId,
      sourceLabel: "local-anvil",
      unit: UNIT,
      observedAt: Number(observedAt),
      observedAtLabel: formatTimestamp(observedAt),
      expiresAt: Number(expiresAt),
      expiresAtLabel: formatTimestamp(expiresAt),
      version: Number(version),
      value: Number(value),
      forecastValue: Number(forecastValue),
      triggerValue: Number(triggerValue),
      payloadHash,
      signatureDigest
    },
    threshold: {
      configured: manifest.reactive.threshold,
      dispatched,
      verdictLabel: dispatched ? "Threshold hit" : "Below threshold",
      summary: dispatched
        ? "Reactive threshold met and destination mirror updated."
        : "Reactive threshold not met; destination mirror unchanged."
    },
    sourceTx: {
      hash: `source-${manifest.sourceChain.chainId}`,
      blockLabel: "latest",
      networkLabel: manifest.sourceChain.name
    },
    reactiveDecision: {
      triggerValue: Number(triggerValue),
      dispatched,
      latencyLabel: "live",
      detail: dispatched
        ? "Local chain mirror indicates Reactive callback execution."
        : "Local chain shows no callback execution."
    },
    destinationTx: {
      hash: hasMirror ? `dest-${manifest.destinationChain.chainId}` : null,
      networkLabel: manifest.destinationChain.name,
      mirrorVersion: hasMirror ? Number(mirroredVersion) : null
    },
    rewardState: {
      recipient: rewardRecipient,
      amountLabel: rewardAmount > 0n ? `${formatEther(rewardAmount)} ETH` : "0 ETH",
      credited,
      claimed: false,
      statusLabel: credited ? "Reward credited" : "No payout"
    },
    timeline: buildTimeline(dispatched, credited),
    chart: [
      {
        version: Number(version),
        value: Number(value),
        forecastValue: Number(forecastValue),
        triggerValue: Number(triggerValue),
        observedAtLabel: formatTimestamp(observedAt).slice(11, 16)
      },
      {
        version: hasMirror ? Number(mirroredVersion) : Number(version),
        value: Number(hasMirror ? mirroredValue : value),
        forecastValue: Number(hasMirror ? mirroredForecastValue : forecastValue),
        triggerValue: Number(hasMirror ? mirroredTriggerValue : triggerValue),
        observedAtLabel: "live"
      }
    ],
    proof: {
      sourceTxHash: `source-${manifest.sourceChain.chainId}`,
      destinationTxHash: hasMirror ? `dest-${manifest.destinationChain.chainId}` : null,
      deliveryId
    }
  };
}
