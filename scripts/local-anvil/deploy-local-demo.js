#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
let createPublicClient;
let createWalletClient;
let http;
let keccak256;
let toHex;
let privateKeyToAccount;

const projectRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(projectRoot, "out");
const dataPath = path.join(projectRoot, "data", "demo-energy-price.csv");

const args = parseArgs(process.argv.slice(2));
const privateKey = args.privateKey;
const rpcUrl = args.rpcUrl ?? "http://127.0.0.1:8545";
const chainId = Number(args.chainId ?? 31337);
const rowIndex = Number(args.row ?? 1);

if (!privateKey) {
  console.error("Missing required argument: --private-key");
  process.exit(1);
}

const sourceArtifact = loadArtifact("SourceFeedEmitter");
const destinationArtifact = loadArtifact("DestinationActionVault");
const subscriberArtifact = loadArtifact("ReactiveEnergySubscriber");
const invokerArtifact = loadArtifact("CallbackInvoker", "demo");

let feedId;
let metricType;
let sourceId;
let publicClient;
let walletClient;
let account;

async function main() {
  const viem = await import("viem");
  const viemAccounts = await import("viem/accounts");
  createPublicClient = viem.createPublicClient;
  createWalletClient = viem.createWalletClient;
  http = viem.http;
  keccak256 = viem.keccak256;
  toHex = viem.toHex;
  privateKeyToAccount = viemAccounts.privateKeyToAccount;

  account = privateKeyToAccount(privateKey);
  const chain = {
    id: chainId,
    name: "Local Anvil",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } }
  };

  publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  feedId = keccak256(toHex("energy-price-demo"));
  metricType = keccak256(toHex("price"));
  sourceId = keccak256(toHex("grid-demo-v1"));

  await ensureBuildArtifacts();

  const invokerAddress = await deployContract(invokerArtifact, []);
  const vaultAddress = await deployContract(destinationArtifact, [invokerAddress, account.address, parseEther("1")]);
  const sourceAddress = await deployContract(sourceArtifact, [account.address]);

  const subscriberAddress = await deployContract(subscriberArtifact, [
    chainId,
    sourceAddress,
    feedId,
    metricType,
    95,
    chainId,
    vaultAddress,
    500000
  ]);

  const payload = buildPayload(rowIndex);

  await writeContract(sourceAddress, sourceArtifact.abi, "publishFeedUpdate", [
    {
      feedId,
      metricType,
      sourceId,
      observedAt: payload.observedAt,
      expiresAt: payload.expiresAt,
      version: payload.version,
      triggerValue: payload.triggerValue,
      value: payload.value,
      forecastValue: payload.forecastValue,
      payloadHash: payload.payloadHash,
      signatureDigest: payload.signatureDigest
    }
  ]);

  await writeContract(invokerAddress, invokerArtifact.abi, "forward", [
    vaultAddress,
    "0x0000000000000000000000000000000000000000",
    feedId,
    metricType,
    payload.value,
    payload.forecastValue,
    payload.observedAt,
    payload.expiresAt,
    payload.version,
    payload.payloadHash,
    payload.signatureDigest,
    sourceId,
    payload.triggerValue,
    0n
  ]);

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceChain: {
      chainId,
      name: "Anvil Source",
      rpcUrl,
      sourceFeedEmitter: sourceAddress
    },
    destinationChain: {
      chainId,
      name: "Anvil Destination",
      rpcUrl,
      destinationActionVault: vaultAddress
    },
    reactive: {
      subscriber: subscriberAddress,
      callbackGasLimit: 500000,
      threshold: 95
    }
  };

  const manifestPath = path.join(projectRoot, "frontend", "public", "local-anvil.manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Local Anvil demo deployed.");
  console.log(`Manifest: ${manifestPath}`);
  console.log(`SourceFeedEmitter: ${sourceAddress}`);
  console.log(`DestinationActionVault: ${vaultAddress}`);
  console.log(`ReactiveEnergySubscriber: ${subscriberAddress}`);
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const entry = argv[i];
    if (!entry.startsWith("--")) {
      continue;
    }
    const key = entry.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      result[camelCase(key)] = next;
      i += 1;
    } else {
      result[camelCase(key)] = true;
    }
  }
  return result;
}

function camelCase(input) {
  return input.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseEther(value) {
  return BigInt(Math.floor(Number(value) * 1e18));
}

function loadArtifact(name, subdir = "") {
  const artifactPath = subdir
    ? path.join(outDir, subdir, `${name}.sol`, `${name}.json`)
    : path.join(outDir, `${name}.sol`, `${name}.json`);
  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact not found: ${artifactPath}`);
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode?.object ? `0x${artifact.bytecode.object}` : artifact.bytecode;
  return { abi: artifact.abi, bytecode };
}

async function ensureBuildArtifacts() {
  const required = [
    path.join(outDir, "SourceFeedEmitter.sol", "SourceFeedEmitter.json"),
    path.join(outDir, "DestinationActionVault.sol", "DestinationActionVault.json"),
    path.join(outDir, "ReactiveEnergySubscriber.sol", "ReactiveEnergySubscriber.json"),
    path.join(outDir, "demo", "CallbackInvoker.sol", "CallbackInvoker.json")
  ];

  const missing = required.filter((file) => !fs.existsSync(file));
  if (missing.length === 0) {
    return;
  }

  console.log("Missing build artifacts. Run `forge build` first.");
  process.exit(1);
}

async function deployContract(artifact, args) {
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error("Deployment failed");
  }
  return receipt.contractAddress;
}

async function writeContract(address, abi, functionName, args) {
  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

function buildPayload(index) {
  const rows = parseCsv(fs.readFileSync(dataPath, "utf8"));
  if (index < 0 || index >= rows.length) {
    throw new Error(`Row index must be between 0 and ${rows.length - 1}`);
  }
  const row = rows[index];
  const observedAt = toUnix(row.timestamp);
  const expiresAt = toUnix(row.expiresAt);

  const canonicalPayload = {
    feedId: "energy-price-demo",
    metricType: row.metricType,
    observedAt,
    expiresAt,
    version: Number(row.version),
    value: Number(row.value),
    forecastValue: Number(row.forecastValue),
    triggerValue: Number(row.triggerValue),
    unit: row.unit,
    source: row.source
  };

  return {
    ...canonicalPayload,
    observedAt,
    expiresAt,
    version: BigInt(canonicalPayload.version),
    value: BigInt(canonicalPayload.value),
    forecastValue: BigInt(canonicalPayload.forecastValue),
    triggerValue: BigInt(canonicalPayload.triggerValue),
    payloadHash: sha256Hex(JSON.stringify(canonicalPayload)),
    signatureDigest: sha256Hex(
      `demo-signature:${row.source}:${row.metricType}:${row.version}:${row.timestamp}`
    )
  };
}

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");

  return lines.map((line) => {
    const values = line.split(",");
    return headers.reduce((record, header, idx) => {
      record[header] = values[idx];
      return record;
    }, {});
  });
}

function toUnix(isoString) {
  const millis = Date.parse(isoString);
  if (Number.isNaN(millis)) {
    throw new Error(`Invalid ISO timestamp: ${isoString}`);
  }
  return Math.floor(millis / 1000);
}

function sha256Hex(input) {
  return `0x${crypto.createHash("sha256").update(input).digest("hex")}`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
