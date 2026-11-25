/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Computes the batch section (`report_batches.ts`) for runs that already finished, from the model calls that
 * `.workflows-step-executions` still holds. It reads the time window of each run from its report JSON. Read only:
 * it writes nothing to Elasticsearch, the ledger or the run files, and prints JSON to stdout.
 *
 *   node batches_of_runs_cli.js --runs <notes>/results/runs --expect-cluster elasticsearch <run id> [<run id> ...]
 */

import fs from 'fs';
import path from 'path';
import { buildBatchSection, type BatchSection } from './report_batches';
import { fetchAll, makeClient, type EsRequest } from './report_run';

interface CallSource {
  status: string;
  input?: { prompt?: string };
  output?: { metadata?: { usage?: { inputTokens?: number } } };
}

export const readBatchCalls = async (
  request: EsRequest,
  { from, to }: { from: string; to: string }
): Promise<Array<{ status: string; prompt: string; inputTokens?: number }>> => {
  const hits = await fetchAll<CallSource>(request, '.workflows-step-executions', {
    sort: [{ startedAt: 'asc' }, { id: 'asc' }],
    query: {
      bool: {
        filter: [
          { term: { stepType: 'ai.prompt' } },
          { term: { workflowId: 'system-security-alert-analysis' } },
          { range: { startedAt: { gte: from, lte: to } } },
        ],
      },
    },
    _source: ['status', 'input.prompt', 'output.metadata.usage.inputTokens'],
  });
  return hits.map(({ _source: s }) => ({
    status: s.status,
    prompt: s.input?.prompt ?? '',
    inputTokens: s.output?.metadata?.usage?.inputTokens,
  }));
};

export const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const option = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const runsDir = option('--runs');
  const expectCluster = option('--expect-cluster');
  const es = option('--es') ?? 'http://localhost:9200';
  const runIds = argv.filter(
    (arg, index) => !arg.startsWith('--') && !argv[index - 1]?.startsWith('--')
  );
  if (!runsDir || !expectCluster || runIds.length === 0) {
    throw new Error('usage: --runs <dir> --expect-cluster <name> [--es <url>] <run id> [...]');
  }

  const request = makeClient(es);
  const { cluster_name: cluster } = await request<{ cluster_name: string }>('GET', '/');
  if (cluster !== expectCluster)
    throw new Error(`refusing to run: cluster is "${cluster}", expected "${expectCluster}"`);

  const result: Record<string, { window: { from: string; to: string }; batches: BatchSection }> =
    {};
  for (const runId of runIds) {
    const { window } = JSON.parse(fs.readFileSync(path.join(runsDir, `${runId}.json`), 'utf8')) as {
      window: { from: string; to: string };
    };
    const calls = await readBatchCalls(request, window);
    result[runId] = { window, batches: buildBatchSection(calls) };
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};
