/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { BRIEF_LIMITS } from '../../../../../common/entity_analytics/executive_brief/constants';
import type { SignalRun } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { noopBriefTelemetry } from '../telemetry/types';
import type { BriefTelemetry } from '../telemetry/types';
import {
  SignalUnavailableError,
  compareStrings,
  errorMessage,
  isIndexNotFoundError,
} from './define_signal';
import { buildEvidence } from './evidence_registry';
import type { SignalResult } from './evidence_registry';
import {
  identityResolution,
  nameFromEuid,
  resolveEntities,
  typeFromEuid,
} from './resolve_entities';
import type { EntityResolution } from './resolve_entities';
import type {
  BriefSignal,
  EntityRef,
  RunSignals,
  SignalContext,
  SignalInput,
  SignalOutput,
  SignalScope,
} from './types';

interface SignalOutcome {
  run: SignalRun;
  output?: SignalOutput;
}

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
  (output.links?.length ?? 0) > 0 ||
  (output.candidates?.length ?? 0) > 0 ||
  (output.entityAttributes?.length ?? 0) > 0;

interface PhaseOptions {
  jobAbort: AbortSignal;
  gatherAbort: AbortSignal;
  telemetry: BriefTelemetry;
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
}): Promise<SignalOutcome> => {
  const start = Date.now();
  const timeoutMs = signal.timeoutMs ?? BRIEF_LIMITS.signalTimeoutMs;
  const finish = (
    status: SignalRun['status'],
    output?: SignalOutput,
    reason?: string
  ): SignalOutcome => ({
    run: {
      id: signal.id,
      title: signal.title,
      capability: signal.capability,
      status,
      ...(reason ? { reason } : {}),
      durationMs: Date.now() - start,
      factCount: output?.facts.length ?? 0,
      linkCount: output?.links?.length ?? 0,
    },
    ...(output ? { output } : {}),
  });
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

/** Runs one phase through a bounded pool; each signal runs in its own span and is recorded. */
const runPhase = <TScope extends SignalScope>(
  ctx: SignalContext,
  signals: ReadonlyArray<BriefSignal<TScope>>,
  input: SignalInput<TScope>,
  options: PhaseOptions
): Promise<SignalOutcome[]> =>
  pMap(
    signals,
    (signal) =>
      options.telemetry.withSignalSpan(signal.id, async () => {
        const outcome = await runOne({ ctx, signal, input, ...options });
        options.telemetry.recordSignal(outcome.run);
        return outcome;
      }),
    { concurrency: BRIEF_LIMITS.signalConcurrency }
  );

/** Every entity a set of outputs mentions, for resolution. */
const referencedEntities = (outputs: SignalOutput[]): EntityRef[] =>
  outputs.flatMap((output) => [
    ...output.facts.flatMap((fact) => fact.entities),
    ...(output.links ?? []).flatMap((link) => [link.from, link.to]),
    ...(output.candidates ?? []),
    ...(output.entityAttributes ?? []).map(({ euid }) => ({
      euid,
      type: typeFromEuid(euid),
      name: nameFromEuid(euid),
    })),
  ]);

const resolveSafely = async (
  ctx: SignalContext,
  refs: EntityRef[],
  abortSignal: AbortSignal
): Promise<EntityResolution> => {
  if (refs.length === 0) {
    return identityResolution([]);
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
    return identityResolution(refs);
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
        ref: resolution.get(golden) ?? { ...candidate, euid: golden },
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
 * and a gather budget; a failing or slow signal is recorded in its `SignalRun` and never fails
 * the run. Only an aborted job (the caller's `abortSignal`) throws.
 */
export const runSignals: RunSignals = async (
  ctx,
  signals,
  { abortSignal, telemetry = noopBriefTelemetry }
) => {
  const gatherAbort = AbortSignal.any([
    abortSignal,
    AbortSignal.timeout(BRIEF_LIMITS.gatherBudgetMs),
  ]);
  const phaseOptions: PhaseOptions = { jobAbort: abortSignal, gatherAbort, telemetry };
  const tenantSignals = signals.filter(
    (signal): signal is BriefSignal<'tenant'> => signal.scope === 'tenant'
  );
  const entitySignals = signals.filter(
    (signal): signal is BriefSignal<'entities'> => signal.scope === 'entities'
  );

  const tenantOutcomes = await runPhase(ctx, tenantSignals, {}, phaseOptions);
  abortSignal.throwIfAborted();

  const tenantOutputs = tenantOutcomes.flatMap(({ output }) => (output ? [output] : []));
  const tenantRefs = referencedEntities(tenantOutputs);
  const tenantResolution = await resolveSafely(ctx, tenantRefs, gatherAbort);
  abortSignal.throwIfAborted();

  const signalRisk = new Map<string, number>();
  tenantOutputs.forEach((output) =>
    (output.entityAttributes ?? []).forEach(({ euid, riskScore }) => {
      const golden = tenantResolution.golden(euid);
      if (riskScore !== undefined && !signalRisk.has(golden)) signalRisk.set(golden, riskScore);
    })
  );
  const candidates = selectCandidates(
    tenantOutcomes.flatMap(({ run, output }) =>
      output?.candidates ? [{ signalId: run.id, candidates: output.candidates }] : []
    ),
    tenantResolution,
    (golden) => tenantResolution.get(golden)?.attributes.riskScore ?? signalRisk.get(golden)
  );

  const entityOutcomes: SignalOutcome[] =
    candidates.length > 0
      ? await runPhase(ctx, entitySignals, { entities: candidates }, phaseOptions)
      : entitySignals.map(
          (signal): SignalOutcome => ({
            run: {
              id: signal.id,
              title: signal.title,
              capability: signal.capability,
              status: 'empty',
              reason: 'No entities to look at.',
              durationMs: 0,
              factCount: 0,
              linkCount: 0,
            },
          })
        );
  abortSignal.throwIfAborted();

  const tenantEuids = new Set(tenantRefs.map(({ euid }) => euid));
  const newRefs = referencedEntities(
    entityOutcomes.flatMap(({ output }) => (output ? [output] : []))
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

  const outcomeById = new Map(
    [...tenantOutcomes, ...entityOutcomes].map((outcome) => [outcome.run.id, outcome])
  );
  const ordered = signals.flatMap((signal) => {
    const outcome = outcomeById.get(signal.id);
    return outcome ? [outcome] : [];
  });
  const results: SignalResult[] = ordered.flatMap(({ run, output }) =>
    output ? [{ signalId: run.id, output }] : []
  );

  return buildEvidence({ results, runs: ordered.map(({ run }) => run), resolution });
};
