/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules */

/*
 * Resolves the tracing-ES connection (url + api key) and the set of example
 * trace ids for a given eval run, so the AD report can be rebuilt from OTLP.
 *
 * Config source order:
 *   1. env: TRACING_ES_URL / TRACING_ES_API_KEY
 *   2. the gitignored kbn-evals vault config.json (tracingEs.{url,apiKey})
 *
 * Trace ids for a run are read from the scores datastream via the tracing ES
 * (each score doc carries task.trace_id). We de-duplicate while preserving the
 * example order.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface TracingEsAuth {
  url: string;
  apiKey: string;
}

const VAULT_CONFIG = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'platform',
  'packages',
  'shared',
  'kbn-evals',
  'scripts',
  'vault',
  'config.json'
);

function readVaultConfig(): Record<string, { url?: string; apiKey?: string }> {
  try {
    return JSON.parse(readFileSync(VAULT_CONFIG, 'utf8'));
  } catch {
    return {};
  }
}

export function loadTracingEsAuth(): TracingEsAuth {
  const envUrl = process.env.TRACING_ES_URL;
  const envKey = process.env.TRACING_ES_API_KEY;
  if (envUrl && envKey) return { url: envUrl, apiKey: envKey };

  const cfg = readVaultConfig();
  const tracing = cfg.tracingEs ?? {};
  const url = envUrl ?? tracing.url;
  const apiKey = envKey ?? tracing.apiKey;
  if (!url || !apiKey) {
    throw new Error(
      'tracing ES auth not found: set TRACING_ES_URL / TRACING_ES_API_KEY or populate kbn-evals vault config.json (tracingEs).'
    );
  }
  return { url, apiKey };
}

/**
 * List distinct example trace ids for a run, in first-seen order, by querying
 * the tracing ES. The evals OTLP exporter does NOT stamp the eval run_id on
 * spans; the reliable linkage is the CI build id (embedded in the run id as
 * `bk-<ciBuildId>::...`) plus the AD dataset name. When the run id is not a
 * `bk-` build id, callers should pass explicit trace ids instead.
 */
export async function listExampleTraceIds(
  runId: string,
  datasetName = 'Attack Discovery All Scenarios'
): Promise<string[]> {
  const auth = loadTracingEsAuth();
  // Extract the CI build id from a run id of the form `bk-<uuid>::suite::model`.
  const buildIdMatch = runId.match(/^bk-([0-9a-f-]{36})::/i);

  const buildFilter = buildIdMatch
    ? [{ term: { 'resource.attributes.ciBuildId': buildIdMatch[1] } }]
    : [];

  // dataset.name and gen_ai.request.model live on different spans of the same
  // trace, so they can't be combined in a single-doc `must`. We aggregate trace
  // ids by dataset name here; the caller (adapter) filters each trace to the
  // subject model by reading gen_ai.request.model off that trace's own spans.
  const body = {
    size: 0,
    query: {
      bool: { must: [...buildFilter, { term: { 'attributes.dataset.name': datasetName } }] },
    },
    aggs: {
      tids: {
        terms: { field: 'trace.id', size: 500 },
        aggs: { first_seen: { min: { field: '@timestamp' } } },
      },
    },
  };
  const res = await fetch(`${auth.url.replace(/\/$/, '')}/traces-*,.ds-traces-*/_search`, {
    method: 'POST',
    headers: { Authorization: `ApiKey ${auth.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `tracing ES ${res.status} ${res.statusText} while listing trace ids for ${runId}`
    );
  }
  const json = (await res.json()) as {
    aggregations?: {
      tids?: { buckets?: Array<{ key: string; first_seen?: { value?: number } }> };
    };
  };
  const buckets = json.aggregations?.tids?.buckets ?? [];
  // Order by first-seen timestamp so the report follows example execution order.
  return buckets
    .slice()
    .sort((a, b) => (a.first_seen?.value ?? 0) - (b.first_seen?.value ?? 0))
    .map((b) => b.key);
}
