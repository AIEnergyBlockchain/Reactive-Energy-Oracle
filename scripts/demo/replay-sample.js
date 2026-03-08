#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const projectRoot = path.resolve(__dirname, "..", "..");
const csvPath = path.join(projectRoot, "data", "demo-energy-price.csv");
const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));

const indexArg = process.argv[2] ?? "0";
const index = Number.parseInt(indexArg, 10);

if (!Number.isInteger(index) || index < 0 || index >= rows.length) {
  console.error(
    `Row index must be an integer between 0 and ${rows.length - 1}. Received: ${indexArg}`
  );
  process.exit(1);
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
  source: row.source,
};

const payload = {
  ...canonicalPayload,
  payloadHash: sha256Hex(JSON.stringify(canonicalPayload)),
  signatureDigest: sha256Hex(
    `demo-signature:${row.source}:${row.metricType}:${row.version}:${row.timestamp}`
  ),
  sourceId: sha256Hex(row.source),
};

console.log(JSON.stringify(payload, null, 2));

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
