/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import type { DiagnosticResult } from '@elastic/transport';
import type { DiagnosticListenerFull } from '@elastic/transport/lib/Diagnostic';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { PageStepEvent } from './page_step_timings';
import type { ScopedLogger } from './with_log_context';

interface BulkSpan {
  startMs: number;
  sentMs: number;
  endMs: number;
  bytes: number;
  docs: number;
  successful: number;
  esTookMs: number;
  transportRetries: number;
  failed: boolean;
}

interface ProductionEvent {
  atMs: number;
  docs: number;
  kind: 'produced' | 'consumed';
}

export interface RiskWriterProfile {
  context: { riskWriterProfileId: string };
  recordDocuments: (kind: ProductionEvent['kind'], docs: number) => void;
  recordStep: (event: PageStepEvent) => void;
  finish: () => void;
}

const round = (ms: number) => Math.round(ms * 100) / 100;

/** Records matching bulk requests and page steps for exploratory writer comparisons. */
export const createRiskWriterProfile = ({
  esClient,
  logger,
  stage,
  mode,
}: {
  esClient: Pick<ElasticsearchClient, 'diagnostic'>;
  logger: ScopedLogger;
  stage: 'base' | 'resolution';
  mode: 'pages' | 'stream';
}): RiskWriterProfile => {
  const startedAt = performance.now();
  const context = { riskWriterProfileId: randomUUID() };
  const pending = new Map<string, BulkSpan>();
  const bulks: BulkSpan[] = [];
  const production: ProductionEvent[] = [];
  const steps: PageStepEvent[] = [];
  const now = () => performance.now() - startedAt;
  const matches = (result: DiagnosticResult | null) => {
    const value = result?.meta.context;
    return (
      typeof value === 'object' &&
      value !== null &&
      'riskWriterProfileId' in value &&
      value.riskWriterProfileId === context.riskWriterProfileId
    );
  };
  const onSerialization: DiagnosticListenerFull = (_error, result) => {
    if (result && matches(result)) {
      const startMs = now();
      pending.set(String(result.meta.request.id), {
        startMs,
        sentMs: startMs,
        endMs: startMs,
        bytes: 0,
        docs: 0,
        successful: 0,
        esTookMs: 0,
        transportRetries: 0,
        failed: false,
      });
    }
  };
  const onRequest: DiagnosticListenerFull = (_error, result) => {
    if (result && matches(result)) {
      const span = pending.get(String(result.meta.request.id));
      if (span && result.meta.attempts === 0) {
        span.sentMs = now();
        span.bytes = Number(result.meta.request.params.headers?.['content-length'] ?? 0);
      }
    }
  };
  const onResponse: DiagnosticListenerFull = (error, result) => {
    if (result && matches(result)) {
      const key = String(result.meta.request.id);
      const span = pending.get(key);
      if (span) {
        const body = result.body as BulkResponse | undefined;
        span.endMs = now();
        span.docs = body?.items?.length ?? 0;
        span.successful = body?.errors
          ? body.items.filter(({ create }) => create?.status === 200 || create?.status === 201)
              .length
          : span.docs;
        span.esTookMs = body?.took ?? 0;
        span.transportRetries = result.meta.attempts;
        span.failed = Boolean(error || body?.errors);
        bulks.push(span);
        pending.delete(key);
      }
    }
  };
  const { diagnostic } = esClient;
  diagnostic.on('serialization', onSerialization);
  diagnostic.on('request', onRequest);
  diagnostic.on('response', onResponse);

  return {
    context,
    recordDocuments: (kind, docs) => production.push({ atMs: round(now()), kind, docs }),
    recordStep: (event) =>
      steps.push({
        ...event,
        startMs: round(event.startMs - startedAt),
        endMs: round(event.endMs - startedAt),
      }),
    finish: () => {
      diagnostic.off('serialization', onSerialization);
      diagnostic.off('request', onRequest);
      diagnostic.off('response', onResponse);
      const durationMs = now();
      const sorted = bulks.sort((left, right) => left.startMs - right.startMs);
      let busyMs = 0;
      let busyEndMs = 0;
      for (const bulk of sorted) {
        busyMs += Math.max(0, bulk.endMs - Math.max(busyEndMs, bulk.startMs));
        busyEndMs = Math.max(busyEndMs, bulk.endMs);
      }
      // Retain numeric spans, then emit once per stage to keep logging out of the page path.
      logger.info(
        `[${stage}] risk writer profile ${JSON.stringify({
          mode,
          startedAt: performance.timeOrigin + startedAt,
          durationMs: round(durationMs),
          requests: bulks.length,
          incompleteRequests: pending.size,
          requestWallMs: round(bulks.reduce((sum, bulk) => sum + bulk.endMs - bulk.startMs, 0)),
          transportPreparationMs: round(
            bulks.reduce((sum, bulk) => sum + bulk.sentMs - bulk.startMs, 0)
          ),
          esTookMs: bulks.reduce((sum, bulk) => sum + bulk.esTookMs, 0),
          busyMs: round(busyMs),
          bytes: bulks.reduce((sum, bulk) => sum + bulk.bytes, 0),
          successful: bulks.reduce((sum, bulk) => sum + bulk.successful, 0),
          bulks: sorted.map((bulk) => ({
            ...bulk,
            startMs: round(bulk.startMs),
            sentMs: round(bulk.sentMs),
            endMs: round(bulk.endMs),
          })),
          production,
          steps,
        })}`
      );
    },
  };
};
