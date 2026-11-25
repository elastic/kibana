/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
// Throwaway: runs the real gate code against c0 sources through the Kibana console proxy.
import { readFileSync } from 'fs';
import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  canOnboard,
  selectSupportedCandidates,
} from '../server/routes/internal/knowledge_indicators/extraction/select_supported_candidates';

const { C0_KIBANA_URL, C0_API_KEY } = process.env;
if (!C0_KIBANA_URL || !C0_API_KEY) {
  throw new Error('C0_KIBANA_URL and C0_API_KEY are required');
}

interface Source {
  id: string;
  slug: string;
  type: string;
  view_name: string;
}

interface QueryLog {
  query: string;
  ms: number;
  outcome: string;
}

const toResponseError = (statusCode: number, body: unknown) =>
  new errors.ResponseError({
    statusCode,
    body,
    headers: {},
    warnings: [],
    meta: {} as unknown as TransportResult['meta'],
  } as TransportResult);

const waitForAbort = (signal?: AbortSignal) =>
  new Promise<never>((_, reject) => {
    const onAbort = () => reject(new errors.RequestAbortedError('Request aborted'));
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });

type Behaviour = 'real' | 'hang' | { status: number; type: string } | { columns: unknown[] };

/** An esClient with only `esql.query`: each call follows the next behaviour, then the last one. */
const createEsClient = (behaviours: Behaviour[], log: QueryLog[]) => {
  let call = 0;
  const query = async (params: { query: string }, options?: { signal?: AbortSignal }) => {
    const behaviour = behaviours[Math.min(call, behaviours.length - 1)];
    call += 1;
    const start = Date.now();
    const done = (outcome: string) => log.push({ query: params.query, ms: Date.now() - start, outcome });
    try {
      if (behaviour === 'hang') {
        return await waitForAbort(options?.signal);
      }
      if (typeof behaviour === 'object' && 'status' in behaviour) {
        throw toResponseError(behaviour.status, {
          error: { type: behaviour.type, reason: 'simulated', root_cause: [{ type: behaviour.type, reason: 'simulated' }] },
          status: behaviour.status,
        });
      }
      if (typeof behaviour === 'object' && 'columns' in behaviour) {
        done('fake columns');
        return { columns: behaviour.columns, values: [] };
      }
      const response = await fetch(`${C0_KIBANA_URL}api/console/proxy?path=_query&method=POST`, {
        method: 'POST',
        headers: {
          Authorization: `ApiKey ${C0_API_KEY}`,
          'kbn-xsrf': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: options?.signal,
      });
      const body = await response.json();
      if (!response.ok) {
        throw toResponseError(response.status, body);
      }
      done(`200${body.is_partial ? ' partial' : ''}`);
      return body;
    } catch (error) {
      if (error instanceof errors.ResponseError) {
        done(`${error.statusCode} ${error.body?.error?.type}`);
        throw error;
      }
      if (error instanceof errors.RequestAbortedError || (error as Error).name === 'AbortError') {
        done('aborted');
        throw new errors.RequestAbortedError('Request aborted');
      }
      done(`error ${(error as Error).message}`);
      throw error;
    }
  };
  return { esql: { query } } as unknown as ElasticsearchClient;
};

const createLogger = (lines: string[]) => {
  const record = (level: string) => (message: string | (() => string)) =>
    lines.push(`${level}: ${typeof message === 'function' ? message() : message}`.replace(/\s+/g, ' '));
  const logger = { warn: record('warn'), debug: record('debug'), get: () => logger };
  return logger as unknown as Logger;
};

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const realSources = async (sources: Source[]) => {
  console.log(`\n== A. real probe, real 15 s timeout, ${sources.length} c0 sources, one at a time`);
  const durations: number[] = [];
  for (const [position, source] of sources.entries()) {
    const log: QueryLog[] = [];
    const lines: string[] = [];
    const start = Date.now();
    const result = await canOnboard({
      index: source.view_name,
      esClient: createEsClient(['real'], log),
      logger: createLogger(lines),
    });
    const ms = Date.now() - start;
    durations.push(ms);
    console.log(
      `${String(position + 1).padStart(2)} ${source.slug.padEnd(36)} ${String(ms).padStart(6)} ms  canOnboard=${
        result.canOnboard
      }  queries=[${log.map(({ ms: queryMs, outcome }) => `${queryMs}ms ${outcome}`).join(', ')}]${
        result.canOnboard ? '' : `\n     reason: ${result.reason.replace(/\s+/g, ' ').slice(0, 300)}`
      }${lines.length ? `\n     ${lines.join('\n     ').slice(0, 400)}` : ''}`
    );
  }
  console.log(
    `   per source: min ${Math.min(...durations)} ms, median ${percentile(durations, 50)} ms, p90 ${percentile(
      durations,
      90
    )} ms, max ${Math.max(...durations)} ms, total ${durations.reduce((sum, ms) => sum + ms, 0)} ms`
  );
};

const realSelection = async (sources: Source[]) => {
  console.log(`\n== B. selectSupportedCandidates over the same ${sources.length} sources, one slot each`);
  const log: QueryLog[] = [];
  const lines: string[] = [];
  const start = Date.now();
  const { toSchedule, skipped, unsupported } = await selectSupportedCandidates({
    candidates: sources.map(({ id, slug, type }) => ({
      sourceId: id,
      sourceSlug: slug,
      sourceType: type,
      lastCompletedAt: null,
    })) as Parameters<typeof selectSupportedCandidates>[0]['candidates'],
    availableSlots: sources.length,
    viewNames: new Map(sources.map(({ id, view_name: viewName }) => [id, viewName])),
    esClient: createEsClient(['real'], log),
    logger: createLogger(lines),
  });
  console.log(
    `   ${Date.now() - start} ms wall, ${log.length} queries; toSchedule=${toSchedule.length} unsupported=${unsupported.length} skipped=${skipped.length}`
  );
  unsupported.forEach(({ sourceSlug, reason }) =>
    console.log(`   unsupported ${sourceSlug}: ${reason.replace(/\s+/g, ' ').slice(0, 300)}`)
  );
};

const NO_TIMESTAMP: Behaviour = { columns: [] };

const failureCases: Array<{ name: string; behaviours: Behaviour[] }> = [
  { name: 'narrowed probe never answers', behaviours: ['hang'] },
  { name: 'full schema never answers', behaviours: [NO_TIMESTAMP, 'hang'] },
  { name: 'document count never answers', behaviours: [NO_TIMESTAMP, NO_TIMESTAMP, 'hang'] },
  { name: 'narrowed probe: 503', behaviours: [{ status: 503, type: 'no_shard_available_action_exception' }] },
  { name: 'narrowed probe: 504', behaviours: [{ status: 504, type: 'gateway_timeout' }] },
  { name: 'narrowed probe: 429', behaviours: [{ status: 429, type: 'es_rejected_execution_exception' }] },
  { name: 'narrowed probe: 408', behaviours: [{ status: 408, type: 'timeout_exception' }] },
  { name: 'narrowed probe: 403', behaviours: [{ status: 403, type: 'security_exception' }] },
  { name: 'full schema: 503', behaviours: [NO_TIMESTAMP, { status: 503, type: 'no_shard_available_action_exception' }] },
  { name: 'control: 400 verification_exception', behaviours: [{ status: 400, type: 'verification_exception' }] },
];

const failures = async (view: string) => {
  console.log('\n== C. probe that cannot answer (simulated Elasticsearch, real gate code and timeout)');
  await Promise.all(
    failureCases.map(async ({ name, behaviours }) => {
      const log: QueryLog[] = [];
      const lines: string[] = [];
      const start = Date.now();
      const result = await canOnboard({
        index: view,
        esClient: createEsClient(behaviours, log),
        logger: createLogger(lines),
      });
      console.log(
        `   ${name.padEnd(38)} ${String(Date.now() - start).padStart(6)} ms  canOnboard=${result.canOnboard}  queries=[${log
          .map(({ outcome }) => outcome)
          .join(', ')}]  ${lines.map((line) => line.slice(0, 110)).join(' | ')}`
      );
    })
  );
};

const mixedSelection = async (sources: Source[]) => {
  console.log('\n== D. selectSupportedCandidates, 1 slot: first candidate never answers, second is a real c0 source');
  const [hanging, healthy] = sources;
  const log: QueryLog[] = [];
  const clients = new Map([
    [hanging.view_name, createEsClient(['hang'], log)],
    [healthy.view_name, createEsClient(['real'], log)],
  ]);
  const esClient = {
    esql: {
      query: (params: { query: string }, options?: { signal?: AbortSignal }) => {
        const view = [...clients.keys()].find((name) => params.query.includes(name));
        if (!view) {
          throw new Error(`no client for ${params.query}`);
        }
        return (clients.get(view) as ElasticsearchClient).esql.query(params, options);
      },
    },
  } as unknown as ElasticsearchClient;
  const start = Date.now();
  const { toSchedule, skipped, unsupported } = await selectSupportedCandidates({
    candidates: [hanging, healthy].map(({ id, slug, type }) => ({
      sourceId: id,
      sourceSlug: slug,
      sourceType: type,
      lastCompletedAt: null,
    })) as Parameters<typeof selectSupportedCandidates>[0]['candidates'],
    availableSlots: 1,
    viewNames: new Map([hanging, healthy].map(({ id, view_name: viewName }) => [id, viewName])),
    esClient,
    logger: createLogger([]),
  });
  console.log(
    `   ${Date.now() - start} ms wall; toSchedule=[${toSchedule
      .map(({ sourceSlug }) => (sourceSlug === hanging.slug ? 'the timed-out source' : 'the second source'))
      .join(', ')}] unsupported=${unsupported.length} skipped=${skipped.length} queries=[${log
      .map(({ outcome }) => outcome)
      .join(', ')}]`
  );
};

const run = async () => {
  const { sources } = JSON.parse(readFileSync('/tmp/c0-sources-307173.json', 'utf8')) as {
    sources: Source[];
  };
  const part = process.argv[2];
  // The gate's timeout timer does not keep the process alive on its own.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    if (part === 'real') {
      await realSources(sources);
      await realSelection(sources);
    } else {
      await failures(sources[0].view_name);
      await mixedSelection(sources);
    }
  } finally {
    clearInterval(keepAlive);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
