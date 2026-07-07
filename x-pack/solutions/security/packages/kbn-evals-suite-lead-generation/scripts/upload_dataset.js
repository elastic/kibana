/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Upserts the Lead Generation JSONL dataset to the golden cluster
 * via the Evals managed-dataset API.
 *
 * Environment variables:
 *   EVALUATIONS_KBN_URL      - Kibana URL of the golden cluster (required)
 *   EVALUATIONS_KBN_API_KEY  - API key for dataset operations (optional)
 *
 * Usage:
 *   # Authenticate first:
 *   source x-pack/platform/packages/shared/kbn-evals/scripts/ci/local_ci_env.sh
 *
 *   # Upload (uses default JSONL path):
 *   node x-pack/solutions/security/packages/kbn-evals-suite-lead-generation/scripts/upload_dataset.js
 *
 *   # Or pass a custom path:
 *   node x-pack/solutions/security/packages/kbn-evals-suite-lead-generation/scripts/upload_dataset.js path/to/file.jsonl
 *
 * After uploading, run the full-dataset eval with:
 *   LEAD_GENERATION_DATASET_NAME="Lead Generation All Scenarios" \
 *     node scripts/evals start --suite lead-generation
 */

const Fs = require('fs');
const Path = require('path');
const Https = require('https');
const Http = require('http');

const DATASET_NAME = 'Lead Generation All Scenarios';
const DATASET_DESCRIPTION =
  'Lead Generation evaluation dataset (all scenarios). Uploaded via upload_dataset.js.';

const DEFAULT_JSONL_PATH = Path.resolve(
  __dirname,
  '../data/eval_dataset_lead_generation_all_scenarios.jsonl'
);

/**
 * Each JSONL line is expected to look like:
 *   {"input":{"maxLeads":10},"output":{"leads":[]},"metadata":{"Title":"..."}}
 *
 * The `output.leads` field is a structural reference only — quality is judged
 * by the LLM rubric evaluator rather than exact-match comparison.
 */
function parseJsonlLine(line, lineNumber) {
  const parsed = JSON.parse(line);
  const input = parsed.input ?? {};
  const leads = (parsed.output && parsed.output.leads) || [];
  return {
    input,
    output: { leads },
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
        'Source local_ci_env.sh or set it manually. See data/README.md for details.'
    );
  }

  if (!Fs.existsSync(jsonlPath)) {
    throw new Error(
      `JSONL file not found at ${jsonlPath}. ` +
        'Place the dataset at data/eval_dataset_lead_generation_all_scenarios.jsonl ' +
        'or pass the path as the first argument. ' +
        'See data/README.md for the expected format.'
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
    return Object.keys(ex.input || {}).length > 0 || (ex.output?.leads?.length ?? 0) > 0;
  });

  if (!hasAnyContent) {
    throw new Error(
      `Parsed ${examples.length} example(s) from ${jsonlPath}, but they are all empty. ` +
        'This usually means the JSONL file contains placeholder objects (`{}`). ' +
        'See data/README.md for the expected format.'
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
            console.log(`\nSuccess (${res.statusCode}): ${data}`);
            console.log(`\nDataset "${DATASET_NAME}" is now available on the golden cluster.`);
            console.log(`To run the full evaluation:\n`);
            console.log(
              `  LEAD_GENERATION_DATASET_NAME="${DATASET_NAME}" node scripts/evals start --suite lead-generation\n`
            );
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
