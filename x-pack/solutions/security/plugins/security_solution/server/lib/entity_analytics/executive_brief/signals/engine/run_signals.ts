/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { Entity } from '@kbn/entity-store/common';
import { isNotFoundError } from '@kbn/es-errors';
import { BRIEF_LIMITS } from '../../../../../../common/entity_analytics/executive_brief/constants';
import { getErrorMessage } from '../../../../../utils/error_helpers';
import { withBriefSpan } from '../../telemetry';
import type { Evidence, Signal, SignalInput, SignalOutcome, SignalResult } from './types';

/** Thrown by a signal when its data source is not there (not set up, no index yet). */
export class SignalUnavailableError extends Error {}

type SignalRun = { result: SignalResult } | { error: unknown; aborted: boolean };

/** A signal's status: from its facts when it returned, from the error when it threw. */
const statusOf = (run: SignalRun): Pick<SignalOutcome, 'status' | 'reason'> => {
  if ('result' in run) {
    return { status: run.result.facts.length > 0 ? 'ok' : 'empty' };
  }
  if (run.aborted) {
    return { status: 'timeout', reason: 'This source did not answer in time.' };
  }
  if (run.error instanceof SignalUnavailableError) {
    return { status: 'unavailable', reason: run.error.message };
  }
  if (isNotFoundError(run.error)) {
    return { status: 'unavailable', reason: 'The data this source reads has not been created.' };
  }
  return { status: 'error', reason: getErrorMessage(run.error) };
};

/** Runs one signal with its own timeout inside `input.abortSignal`; a failure becomes its outcome. */
const runSignal = async (signal: Signal, input: SignalInput) => {
  const start = Date.now();
  const abortSignal = AbortSignal.any([
    input.abortSignal,
    AbortSignal.timeout(BRIEF_LIMITS.signalTimeoutMs),
  ]);
  const run: SignalRun = await signal.run({ ...input, abortSignal }).then(
    (result) => ({ result }),
    (error: unknown) => ({ error, aborted: abortSignal.aborted })
  );
  const { status, reason } = statusOf(run);
  if (reason) {
    const level = status === 'error' ? 'warn' : 'debug';
    input.logger[level](`[executive brief] signal "${signal.id}" ${status}: ${reason}`);
  }
  const result = 'result' in run ? run.result : { facts: [], entities: [] };
  const took = Date.now() - start;
  return {
    result,
    outcome: { id: signal.id, status, reason, took, factCount: result.facts.length },
  };
};

/** Numbers the facts in signal order and keys the entities by EUID, the first record winning. */
const collect = (results: SignalResult[]): Pick<Evidence, 'entities' | 'facts'> => {
  const facts = results
    .flatMap((result) => result.facts)
    .map((fact, index) => ({ ...fact, id: index + 1 }));
  const entities: Record<string, Entity> = {};
  for (const record of results.flatMap((result) => result.entities)) {
    const euid = record.entity?.id;
    if (euid) {
      entities[euid] ??= record;
    }
  }
  return { entities, facts };
};

/** Runs the signals in a bounded pool within the gather budget; a failure is recorded, only an abort throws. */
export const runSignals = async (
  signals: readonly Signal[],
  input: SignalInput
): Promise<Evidence> => {
  const gatherSignal = AbortSignal.any([
    input.abortSignal,
    AbortSignal.timeout(BRIEF_LIMITS.gatherBudgetMs),
  ]);
  const runs = await pMap(
    signals,
    (signal) =>
      withBriefSpan('signal', { 'signal.id': signal.id }, async (span) => {
        const run = await runSignal(signal, { ...input, abortSignal: gatherSignal });
        const { status, factCount } = run.outcome;
        span?.setAttributes({ 'signal.status': status, 'signal.fact_count': factCount });
        return run;
      }),
    { concurrency: BRIEF_LIMITS.signalConcurrency }
  );
  input.abortSignal.throwIfAborted();
  return {
    ...collect(runs.map(({ result }) => result)),
    signals: runs.map(({ outcome }) => outcome),
  };
};
