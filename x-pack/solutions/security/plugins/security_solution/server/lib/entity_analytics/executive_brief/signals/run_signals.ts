/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { BRIEF_LIMITS } from '../../../../../common/entity_analytics/executive_brief/constants';
import { withBriefSpan } from '../telemetry';
import {
  SignalUnavailableError,
  compareStrings,
  errorMessage,
  isIndexNotFoundError,
} from './define_signal';
import { buildEvidence } from './evidence_registry';
import type { SignalResult } from './evidence_registry';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import { toEntityRef } from '../entity_record';
import { identityResolution, resolveEntities } from './resolve_entities';
import type { EntityResolution } from './resolve_entities';
import type {
  BriefSignal,
  EntityRef,
  RunSignals,
  SignalContext,
  SignalInput,
  SignalOutcome,
  SignalOutput,
  SignalScope,
} from './types';

interface SignalRunResult {
  outcome: SignalOutcome;
  output?: SignalOutput;
}

/** Statuses whose reason says why a signal could not check its source. */
const NOT_CHECKED: ReadonlySet<SignalOutcome['status']> = new Set([
  'unavailable',
  'timeout',
  'error',
]);

/** Rejects as soon as `signal` aborts, even if the wrapped work ignores the signal. */
const raceAbort = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> => {
  if (signal.aborted) {
    promise.catch(() => undefined);
    return Promise.reject(signal.reason);
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
};

const hasContent = (output: SignalOutput): boolean =>
  output.facts.length > 0 ||
  (output.candidates?.length ?? 0) > 0 ||
  (output.entityRecords?.length ?? 0) > 0;

interface PhaseOptions {
  jobAbort: AbortSignal;
  gatherAbort: AbortSignal;
}

const runOne = async <TScope extends SignalScope>({
  ctx,
  signal,
  input,
  jobAbort,
  gatherAbort,
}: PhaseOptions & {
  ctx: SignalContext;
  signal: BriefSignal<TScope>;
  input: SignalInput<TScope>;
}): Promise<SignalRunResult> => {
  const start = Date.now();
  const timeoutMs = signal.timeoutMs ?? BRIEF_LIMITS.signalTimeoutMs;
  const finish = (
    status: SignalOutcome['status'],
    output?: SignalOutput,
    reason?: string
  ): SignalRunResult => {
    if (reason && NOT_CHECKED.has(status)) {
      ctx.logger.debug(`[executive brief] signal "${signal.id}" ${status}: ${reason}`);
    }
    return {
      outcome: {
        id: signal.id,
        status,
        ...(reason ? { reason } : {}),
        took: Date.now() - start,
        factCount: output?.facts.length ?? 0,
      },
      ...(output ? { output } : {}),
    };
  };
  const timeoutReason = (): string =>
    jobAbort.aborted
      ? 'The brief was cancelled before this source finished.'
      : gatherAbort.aborted
      ? 'The time budget for gathering evidence ran out before this source finished.'
      : `This source did not answer within ${Math.round(timeoutMs / 1000)} seconds.`;

  if (gatherAbort.aborted) {
    return finish('timeout', undefined, timeoutReason());
  }
  const abortSignal = AbortSignal.any([gatherAbort, AbortSignal.timeout(timeoutMs)]);

  try {
    const availability = await raceAbort(signal.isAvailable(ctx), abortSignal);
    if (!availability.available) {
      return finish('unavailable', undefined, availability.reason);
    }
    const output = await raceAbort(signal.run(ctx, input, abortSignal), abortSignal);
    return finish(hasContent(output) ? 'ok' : 'empty', output);
  } catch (error) {
    if (abortSignal.aborted) {
      return finish('timeout', undefined, timeoutReason());
    }
    if (error instanceof SignalUnavailableError) {
      return finish('unavailable', undefined, error.message);
    }
    if (isIndexNotFoundError(error)) {
      return finish('unavailable', undefined, 'The data this source reads has not been created.');
    }
    ctx.logger.warn(`[executive brief] signal "${signal.id}" failed: ${errorMessage(error)}`);
    return finish('error', undefined, errorMessage(error));
  }
};

/** Runs one phase through a bounded pool; each signal runs in its own span. */
const runPhase = <TScope extends SignalScope>(
  ctx: SignalContext,
  signals: ReadonlyArray<BriefSignal<TScope>>,
  input: SignalInput<TScope>,
  options: PhaseOptions
): Promise<SignalRunResult[]> =>
  pMap(
    signals,
    (signal) =>
      withBriefSpan('signal', { 'signal.id': signal.id }, async (span) => {
        const result = await runOne({ ctx, signal, input, ...options });
        span?.setAttributes({
          'signal.status': result.outcome.status,
          'signal.fact_count': result.outcome.factCount,
        });
        return result;
      }),
    { concurrency: BRIEF_LIMITS.signalConcurrency }
  );

/** Every entity a set of outputs mentions, for resolution. */
const referencedEntities = (outputs: SignalOutput[]): EntityRef[] =>
  outputs.flatMap((output) => [
    ...output.facts.flatMap((fact) => fact.entities),
    ...(output.candidates ?? []),
    ...(output.entityRecords ?? []).flatMap((record) => {
      const euid = record.entity?.id;
      return euid ? [toEntityRef(record, euid)] : [];
    }),
  ]);

const resolveSafely = async (
  ctx: SignalContext,
  refs: EntityRef[],
  abortSignal: AbortSignal
): Promise<EntityResolution> => {
  if (refs.length === 0) {
    return identityResolution();
  }
  try {
    return await resolveEntities({
      esClient: ctx.esClient,
      spaceId: ctx.spaceId,
      refs,
      abortSignal,
    });
  } catch (error) {
    if (!abortSignal.aborted && !isIndexNotFoundError(error)) {
      ctx.logger.warn(`[executive brief] entity resolution failed: ${errorMessage(error)}`);
    }
    return identityResolution();
  }
};

/** Resolution that answers from `first` for the euids it resolved, and from `second` otherwise. */
const combineResolutions = (
  first: EntityResolution,
  firstEuids: ReadonlySet<string>,
  second: EntityResolution
): EntityResolution => ({
  golden: (euid) => (firstEuids.has(euid) ? first.golden(euid) : second.golden(euid)),
  get: (euid) => first.get(euid) ?? second.get(euid),
  membersOf: (euid) => (first.get(euid) ? first.membersOf(euid) : second.membersOf(euid)),
  docOf: (euid) => first.docOf(euid) ?? second.docOf(euid),
});

const resolvedRef = (resolution: EntityResolution, golden: string): EntityRef | undefined => {
  const record = resolution.get(golden);
  return record ? toEntityRef(record, golden) : undefined;
};

/**
 * Ranks nominated candidates by how many signals nominated them, then by risk, then by euid, and
 * keeps the top `BRIEF_LIMITS.maxCandidates` golden entities.
 */
const selectCandidates = (
  nominations: ReadonlyArray<{ signalId: string; candidates: readonly EntityRef[] }>,
  resolution: EntityResolution,
  riskOf: (goldenEuid: string) => number | undefined
): EntityRef[] => {
  const byGolden = new Map<string, { ref: EntityRef; signals: Set<string> }>();
  for (const { signalId, candidates } of nominations) {
    for (const candidate of candidates) {
      const golden = resolution.golden(candidate.euid);
      const entry = byGolden.get(golden) ?? {
        ref: resolvedRef(resolution, golden) ?? { ...candidate, euid: golden },
        signals: new Set<string>(),
      };
      entry.signals.add(signalId);
      byGolden.set(golden, entry);
    }
  }
  return [...byGolden.entries()]
    .sort(
      ([a, entryA], [b, entryB]) =>
        entryB.signals.size - entryA.signals.size ||
        (riskOf(b) ?? -1) - (riskOf(a) ?? -1) ||
        compareStrings(a, b)
    )
    .slice(0, BRIEF_LIMITS.maxCandidates)
    .map(([euid, { ref }]) => ({ euid, type: ref.type, name: ref.name }));
};

/**
 * The signal engine: tenant signals → merged candidates → resolution → capped candidate set →
 * entity signals → evidence registry. Signals run through a bounded pool with a per-signal timeout
 * and a gather budget; a failing or slow signal is recorded in its `SignalOutcome` and never fails
 * the run. Only an aborted job (the caller's `abortSignal`) throws.
 */
export const runSignals: RunSignals = async (ctx, signals, { abortSignal }) => {
  const gatherAbort = AbortSignal.any([
    abortSignal,
    AbortSignal.timeout(BRIEF_LIMITS.gatherBudgetMs),
  ]);
  const phaseOptions: PhaseOptions = { jobAbort: abortSignal, gatherAbort };
  const tenantSignals = signals.filter(
    (signal): signal is BriefSignal<'tenant'> => signal.scope === 'tenant'
  );
  const entitySignals = signals.filter(
    (signal): signal is BriefSignal<'entities'> => signal.scope === 'entities'
  );

  const tenantResults = await runPhase(ctx, tenantSignals, {}, phaseOptions);
  abortSignal.throwIfAborted();

  const tenantOutputs = tenantResults.flatMap(({ output }) => (output ? [output] : []));
  const tenantRefs = referencedEntities(tenantOutputs);
  const tenantResolution = await resolveSafely(ctx, tenantRefs, gatherAbort);
  abortSignal.throwIfAborted();

  const signalRisk = new Map<string, number>();
  tenantOutputs.forEach((output) =>
    (output.entityRecords ?? []).forEach((record) => {
      const euid = record.entity?.id;
      const score = getEntityRisk(record)?.score;
      if (euid === undefined || score === undefined) return;
      const golden = tenantResolution.golden(euid);
      if (!signalRisk.has(golden)) signalRisk.set(golden, score);
    })
  );
  const riskOf = (golden: string): number | undefined => {
    const record = tenantResolution.get(golden);
    return (record && getEntityRisk(record)?.score) ?? signalRisk.get(golden);
  };
  const candidates = selectCandidates(
    tenantResults.flatMap(({ outcome, output }) =>
      output?.candidates ? [{ signalId: outcome.id, candidates: output.candidates }] : []
    ),
    tenantResolution,
    riskOf
  );

  const entityResults: SignalRunResult[] =
    candidates.length > 0
      ? await runPhase(ctx, entitySignals, { entities: candidates }, phaseOptions)
      : entitySignals.map(
          (signal): SignalRunResult => ({
            outcome: {
              id: signal.id,
              status: 'empty',
              reason: 'No entities to look at.',
              took: 0,
              factCount: 0,
            },
          })
        );
  abortSignal.throwIfAborted();

  const tenantEuids = new Set(tenantRefs.map(({ euid }) => euid));
  const newRefs = referencedEntities(
    entityResults.flatMap(({ output }) => (output ? [output] : []))
  ).filter(({ euid }) => !tenantEuids.has(euid) && tenantResolution.get(euid) === undefined);
  const resolution =
    newRefs.length > 0
      ? combineResolutions(
          tenantResolution,
          tenantEuids,
          await resolveSafely(ctx, newRefs, gatherAbort)
        )
      : tenantResolution;
  abortSignal.throwIfAborted();

  const resultById = new Map(
    [...tenantResults, ...entityResults].map((result) => [result.outcome.id, result])
  );
  const ordered = signals.flatMap((signal) => {
    const result = resultById.get(signal.id);
    return result ? [result] : [];
  });
  const results: SignalResult[] = ordered.flatMap(({ outcome, output }) =>
    output ? [{ signalId: outcome.id, output }] : []
  );
  const outcomes = ordered.map(({ outcome }) => outcome);

  return { evidence: buildEvidence({ results, outcomes, resolution }), outcomes };
};
