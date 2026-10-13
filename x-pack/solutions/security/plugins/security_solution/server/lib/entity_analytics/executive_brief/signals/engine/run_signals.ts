/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { isNotFoundError } from '@kbn/es-errors';
import { BRIEF_LIMITS } from '../../../../../../common/entity_analytics/executive_brief/constants';
import { withBriefSpan } from '../../telemetry';
import { SignalUnavailableError, errorMessage } from './define_signal';
import { buildEvidence } from './evidence_registry';
import type { BriefSignal, FactDraft, GatherResult, SignalContext, SignalOutcome } from './types';

/** Rejects as soon as `signal` aborts, even if the wrapped work ignores it. */
const raceAbort = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      if (signal.aborted) reject(signal.reason);
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }),
  ]);

const runOne = async (
  ctx: SignalContext,
  signal: BriefSignal,
  jobAbort: AbortSignal,
  gatherAbort: AbortSignal
): Promise<{ outcome: SignalOutcome; facts: FactDraft[] }> => {
  const start = Date.now();
  const timeoutMs = signal.timeoutMs ?? BRIEF_LIMITS.signalTimeoutMs;
  const abortSignal = AbortSignal.any([gatherAbort, AbortSignal.timeout(timeoutMs)]);
  const finish = (status: SignalOutcome['status'], facts: FactDraft[] = [], reason?: string) => {
    if (reason) ctx.logger.debug(`[executive brief] signal "${signal.id}" ${status}: ${reason}`);
    const took = Date.now() - start;
    const outcome = { id: signal.id, status, ...(reason ? { reason } : {}), took };
    return { outcome: { ...outcome, factCount: facts.length }, facts };
  };

  try {
    const facts = await raceAbort(signal.run(ctx, abortSignal), abortSignal);
    return finish(facts.length > 0 ? 'ok' : 'empty', facts);
  } catch (error) {
    if (abortSignal.aborted) {
      const reason = jobAbort.aborted
        ? 'The brief was cancelled before this source finished.'
        : gatherAbort.aborted
        ? 'The time budget for gathering evidence ran out before this source finished.'
        : `This source did not answer within ${Math.round(timeoutMs / 1000)} seconds.`;
      return finish('timeout', [], reason);
    }
    if (error instanceof SignalUnavailableError) {
      return finish('unavailable', [], error.message);
    }
    if (isNotFoundError(error)) {
      return finish('unavailable', [], 'The data this source reads has not been created.');
    }
    ctx.logger.warn(`[executive brief] signal "${signal.id}" failed: ${errorMessage(error)}`);
    return finish('error', [], errorMessage(error));
  }
};

/**
 * Runs every signal through a bounded pool, each in its own span, with a per-signal timeout and a
 * gather budget. A failing or slow signal is recorded in its outcome and never fails the run; only
 * an aborted job throws. Evidence follows signal order, not completion order.
 */
export const runSignals = async (
  ctx: SignalContext,
  signals: readonly BriefSignal[],
  { abortSignal }: { abortSignal: AbortSignal }
): Promise<GatherResult> => {
  const gatherAbort = AbortSignal.any([
    abortSignal,
    AbortSignal.timeout(BRIEF_LIMITS.gatherBudgetMs),
  ]);
  const results = await pMap(
    signals,
    (signal) =>
      withBriefSpan('signal', { 'signal.id': signal.id }, async (span) => {
        const result = await runOne(ctx, signal, abortSignal, gatherAbort);
        span?.setAttributes({
          'signal.status': result.outcome.status,
          'signal.fact_count': result.outcome.factCount,
        });
        return result;
      }),
    { concurrency: BRIEF_LIMITS.signalConcurrency }
  );
  abortSignal.throwIfAborted();

  const outcomes = results.map(({ outcome }) => outcome);
  const evidence = buildEvidence(
    results.map(({ outcome, facts }) => ({ signalId: outcome.id, facts })),
    outcomes
  );
  return { evidence, outcomes };
};
