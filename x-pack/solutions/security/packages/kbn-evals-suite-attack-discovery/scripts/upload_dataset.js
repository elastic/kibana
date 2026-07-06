/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Upserts the Attack Discovery JSONL dataset to the golden cluster
 * via the Evals managed-dataset API.
 *
 * Environment variables (see kbn-evals README for details):
 *   EVALUATIONS_KBN_URL  - Kibana URL of the golden cluster (required)
 *   EVALUATIONS_KBN_API_KEY - API key for dataset operations (optional)
 *
 * Usage:
 *   bash -lc 'source x-pack/platform/packages/shared/kbn-evals/scripts/ci/local_ci_env.sh && \
 *     node x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/scripts/upload_dataset.js [path/to/file.jsonl]'
 */

// eslint-disable-next-line @kbn/imports/no_unresolvable_imports
const Fs = require('fs');
const Path = require('path');
const Https = require('https');
const Http = require('http');

const DATASET_NAME = 'Attack Discovery All Scenarios';
const DATASET_DESCRIPTION =
  'Attack Discovery evaluation dataset (all scenarios). Uploaded via upload_dataset.js.';

const DEFAULT_JSONL_PATH = Path.resolve(
  __dirname,
  '../data/eval_dataset_attack_discovery_all_scenarios.jsonl'
);

function parseJsonlLine(line, lineNumber) {
  const parsed = JSON.parse(line);
  const anonymizedAlerts = (parsed.inputs && parsed.inputs.anonymizedAlerts) || [];
  const attackDiscoveries = (parsed.outputs && parsed.outputs.attackDiscoveries) || [];
  return {
    input: { mode: 'bundledAlerts', anonymizedAlerts },
    output: { attackDiscoveries },
    metadata: parsed.metadata || { Title: `Line ${lineNumber}` },
  };
}

async function main() {
  const jsonlPath = process.argv[2] || DEFAULT_JSONL_PATH;
  const kbnUrl = process.env.EVALUATIONS_KBN_URL;
  const apiKey = process.env.EVALUATIONS_KBN_API_KEY;

  if (!kbnUrl) {
    throw new Error(
      'EVALUATIONS_KBN_URL is not set. ' +
        'Source local_ci_env.sh or set it manually. See kbn-evals README.'
    );
  }

  if (!Fs.existsSync(jsonlPath)) {
    throw new Error(
      `JSONL file not found at ${jsonlPath}. ` +
        'Place the dataset at data/eval_dataset_attack_discovery_all_scenarios.jsonl ' +
        'or pass the path as the first argument.'
    );
  }

  const text = Fs.readFileSync(jsonlPath, 'utf-8');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log(`Parsed ${lines.length} examples from ${jsonlPath}`);

  const examples = lines.map((line, i) => parseJsonlLine(line, i + 1));

  const hasAnyContent = examples.some((ex) => {
    const alertCount = Array.isArray(ex?.input?.anonymizedAlerts)
      ? ex.input.anonymizedAlerts.length
      : 0;
    const discoveryCount = Array.isArray(ex?.output?.attackDiscoveries)
      ? ex.output.attackDiscoveries.length
      : 0;
    return alertCount > 0 || discoveryCount > 0;
  });

  if (!hasAnyContent) {
    throw new Error(
      `Parsed ${examples.length} example(s) from ${jsonlPath}, but they are all empty. ` +
        'This usually means you are uploading a placeholder dataset (e.g. `{}`) or the JSONL format is not what the parser expects.'
    );
  }

  const body = JSON.stringify({
    name: DATASET_NAME,
    description: DATASET_DESCRIPTION,
    examples,
  });

  const url = new URL('/internal/evals/datasets/_upsert', kbnUrl);
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? Https : Http;

  const headers = {
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
    'elastic-api-version': '1',
    'x-elastic-internal-origin': 'Kibana',
  };
  if (apiKey) {
    headers.Authorization = `ApiKey ${apiKey}`;
  }

  console.log(`Upserting dataset "${DATASET_NAME}" to ${url.origin}...`);

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers,
        rejectUnauthorized: false,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Success (${res.statusCode}): ${data}`);
            resolve();
          } else {
            reject(new Error(`Dataset upsert failed (${res.statusCode}): ${data}`));
          }
        });
      }
    );
    req.on('error', (err) => {
      console.error('Request error:', err.message);
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
