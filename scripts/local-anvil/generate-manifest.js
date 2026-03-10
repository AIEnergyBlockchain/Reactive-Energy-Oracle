#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = parseArgs(process.argv.slice(2));

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceChain: {
    chainId: Number(args.sourceChainId ?? 31337),
    name: args.sourceName ?? "Anvil Source",
    rpcUrl: args.sourceRpc ?? "http://127.0.0.1:8545",
    sourceFeedEmitter: requiredArg(args.sourceEmitter, "source-emitter")
  },
  destinationChain: {
    chainId: Number(args.destinationChainId ?? args.sourceChainId ?? 31337),
    name: args.destinationName ?? "Anvil Destination",
    rpcUrl: args.destinationRpc ?? args.sourceRpc ?? "http://127.0.0.1:8545",
    destinationActionVault: requiredArg(args.destinationVault, "destination-vault")
  },
  reactive: {
    subscriber: args.subscriber ?? "0x0000000000000000000000000000000000000000",
    callbackGasLimit: Number(args.callbackGasLimit ?? 500000),
    threshold: Number(args.threshold ?? 95)
  }
};

const outPath = args.out ?? path.join(process.cwd(), "frontend", "public", "local-anvil.manifest.json");
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Manifest written to ${outPath}`);

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      continue;
    }
    const key = value.slice(2);
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

function requiredArg(value, name) {
  if (!value) {
    console.error(`Missing required argument --${name}`);
    process.exit(1);
  }
  return value;
}
