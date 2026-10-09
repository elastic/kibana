/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefBlindSpots,
  BriefEntity,
  BriefGlance,
  BriefJobStage,
  BriefSnapshot,
  ExecutiveBriefJob,
  GenerateBriefRequestBody,
  GlanceStat,
  StorylinesResult,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { assessAttention } from '../assessment';
import type { BriefGenerator } from '../generation/types';
import type { SnapshotContext, SnapshotPart, SnapshotSources } from '../snapshot/context';
import { validateBrief } from '../validation/validate_brief';
import type { BriefJobStore } from './brief_job_store';
import { BriefJobError, toJobError } from './job_errors';

type Timings = NonNullable<ExecutiveBriefJob['timings']>;

/** The snapshot builders (lanes 2-4), injected so the run is executor- and source-agnostic. */
export interface SnapshotBuilders {
  buildGlance: (
    ctx: SnapshotContext
  ) => Promise<SnapshotPart<{ glance: BriefGlance; riskMoverEuids: string[] }>>;
  buildStorylines: (
    ctx: SnapshotContext,
    input: { materialRiskEuids: string[]; riskMoverEuids: string[] }
  ) => Promise<SnapshotPart<StorylinesResult>>;
  buildBlindSpots: (
    ctx: SnapshotContext,
    input: { storylineEuids: string[]; materialRiskEuids: string[] }
  ) => Promise<SnapshotPart<BriefBlindSpots>>;
  fetchBriefEntities: (
    ctx: SnapshotContext,
    euids: string[]
  ) => Promise<Record<string, BriefEntity>>;
}

/** Flags entities the storyline builder treated as shared infrastructure (hub guard). */
const markHubs = (
  entities: Record<string, BriefEntity>,
  hubEuids: string[]
): Record<string, BriefEntity> => {
  const hubs = new Set(hubEuids);
  return Object.fromEntries(
    Object.entries(entities).map(([euid, entity]) => [
      euid,
      hubs.has(euid) ? { ...entity, isHub: true } : entity,
    ])
  );
};

export interface RunExecutiveBriefArgs {
  briefId: string;
  params: GenerateBriefRequestBody;
  /** Built by the executor (user-scoped clients, registry, abort signal). */
  context: SnapshotContext;
  builders: SnapshotBuilders;
  generator: BriefGenerator;
  store: BriefJobStore;
  now?: () => number;
}

const MATERIAL_RISK_LEVELS: ReadonlyArray<BriefEntity['riskLevel']> = ['High', 'Critical'];

const unique = (values: readonly string[]): string[] => [...new Set(values)];

/** Every golden euid the snapshot refers to, so each one has an entity record. */
const referencedEuids = ({
  glance,
  storylines,
  blindSpots,
}: {
  glance: BriefGlance;
  storylines: StorylinesResult;
  blindSpots: BriefBlindSpots;
}): string[] =>
  unique([
    ...glance.exposureLeaders,
    ...glance.needsAttention.flatMap((tile) => tile.sample),
    ...storylines.otherNotableEntities,
    ...storylines.storylines.flatMap((storyline) => [
      ...storyline.entityEuids,
      ...storyline.hubEuids,
      ...storyline.seeds.flatMap((seed) => seed.entityEuids),
      ...storyline.edges.flatMap((edge) => [edge.from, edge.to]),
      ...storyline.events.flatMap((event) => event.entityEuids),
    ]),
    ...blindSpots.gaps.flatMap((gap) => gap.entityEuids ?? []),
  ]);

/** Number of attack stages with any observed activity (alerts, attack discoveries or ML). */
export const countStagesWithActivity = (blindSpots: BriefBlindSpots): number =>
  blindSpots.attackStages.stages.filter(
    ({ observed }) => observed.alerts + observed.attackDiscoveries + observed.mlAnomalies > 0
  ).length;

const withStagesWithActivityStat = (glance: BriefGlance, value: number): BriefGlance => {
  const stat: GlanceStat = { id: 'stagesWithActivity', value, upIsBad: true };
  return {
    ...glance,
    stats: [...glance.stats.filter(({ id }) => id !== 'stagesWithActivity'), stat],
  };
};

/**
 * Runs one Executive Brief job end to end and persists progress on the job document:
 * glance, storylines, blind spots, entities, generate, validate, persist.
 *
 * Every failure is mapped to an explicit `error.code` on the job (see `toJobError`); nothing is
 * swallowed and there is no fallback generator. Resolves once the job document is terminal.
 * Rejects only if the failure itself cannot be recorded.
 */
export const runExecutiveBrief = async ({
  briefId,
  params,
  context,
  builders,
  generator,
  store,
  now = Date.now,
}: RunExecutiveBriefArgs): Promise<void> => {
  const { logger, abortSignal } = context;
  const timings: Timings = {};
  const startedAtMs = now();

  const throwIfAborted = (stage: BriefJobStage): void => {
    if (abortSignal.aborted) {
      throw new BriefJobError('timeout', `The brief job was aborted before the ${stage} stage`);
    }
  };

  const timed = async <T>(stage: BriefJobStage, fn: () => Promise<T>): Promise<T> => {
    throwIfAborted(stage);
    const stageStart = now();
    try {
      return await fn();
    } finally {
      timings[stage] = (timings[stage] ?? 0) + (now() - stageStart);
    }
  };

  try {
    await store.update(briefId, {
      status: 'running',
      stage: 'snapshot',
      startedAt: new Date(startedAtMs).toISOString(),
    });

    const glancePart = await timed('snapshot', () => builders.buildGlance(context));
    const { glance: rawGlance, riskMoverEuids } = glancePart.value;

    // "Material risk" = exposure leaders that are High or Critical.
    const leaderEntities = await timed('snapshot', () =>
      builders.fetchBriefEntities(context, rawGlance.exposureLeaders)
    );
    const materialRiskEuids = rawGlance.exposureLeaders.filter((euid) =>
      MATERIAL_RISK_LEVELS.includes(leaderEntities[euid]?.riskLevel)
    );

    await store.update(briefId, { stage: 'storylines', timings: { ...timings } });
    const storylinesPart = await timed('storylines', () =>
      builders.buildStorylines(context, { materialRiskEuids, riskMoverEuids })
    );

    await store.update(briefId, { stage: 'blind_spots', timings: { ...timings } });
    const blindSpotsPart = await timed('blind_spots', () =>
      builders.buildBlindSpots(context, {
        storylineEuids: unique(
          storylinesPart.value.storylines.flatMap((storyline) => storyline.entityEuids)
        ),
        materialRiskEuids,
      })
    );

    const glance = withStagesWithActivityStat(
      rawGlance,
      countStagesWithActivity(blindSpotsPart.value)
    );

    const missing = referencedEuids({
      glance,
      storylines: storylinesPart.value,
      blindSpots: blindSpotsPart.value,
    }).filter((euid) => leaderEntities[euid] === undefined);
    const fetched =
      missing.length > 0
        ? await timed('blind_spots', () => builders.fetchBriefEntities(context, missing))
        : {};

    const sources: SnapshotSources = {
      ...glancePart.sources,
      ...storylinesPart.sources,
      ...blindSpotsPart.sources,
    };

    const entities = markHubs(
      { ...leaderEntities, ...fetched },
      storylinesPart.value.storylines.flatMap((storyline) => storyline.hubEuids)
    );
    // Deterministic verdict; needs threats, blind spots and entity records, so it comes last.
    const assessment = assessAttention({
      glance,
      storylines: storylinesPart.value,
      blindSpots: blindSpotsPart.value,
      entities,
    });

    const snapshot: BriefSnapshot = {
      spaceId: context.spaceId,
      generatedAt: context.timeRange.to,
      timeRange: context.timeRange,
      glance: { ...glance, assessment },
      storylines: storylinesPart.value,
      blindSpots: blindSpotsPart.value,
      entities,
      catalog: context.registry.toCatalog(),
      sources,
    };

    await store.update(briefId, { stage: 'generate', snapshot, timings: { ...timings } });
    const generated = await timed('generate', () =>
      generator.generate({ snapshot, mode: params.mode, abortSignal })
    );

    await store.update(briefId, { stage: 'validate', timings: { ...timings } });
    const { brief, validation } = await timed('validate', async () =>
      validateBrief({ brief: generated.brief, snapshot, mode: params.mode })
    );

    await store.update(briefId, { stage: 'persist', timings: { ...timings } });
    await timed('persist', () =>
      store.update(briefId, {
        brief,
        validation,
        ...(generated.tokens ? { tokens: generated.tokens } : {}),
        // Only a model-written brief has a model; the template generator is not one.
        ...(generator.kind === 'inference' && generated.model ? { model: generated.model } : {}),
      })
    );

    await store.update(briefId, {
      status: 'succeeded',
      completedAt: new Date(now()).toISOString(),
      timings: { ...timings },
    });
    logger.info(
      `[ExecutiveBrief] ${briefId} succeeded in ${now() - startedAtMs}ms (dropped ${
        validation.droppedClaims
      }/${validation.totalClaims} claims)`
    );
  } catch (error) {
    const jobError = toJobError(error, abortSignal);
    logger.error(`[ExecutiveBrief] ${briefId} failed (${jobError.code}): ${jobError.message}`);
    await store.update(briefId, {
      status: 'failed',
      error: jobError,
      completedAt: new Date(now()).toISOString(),
      timings: { ...timings },
    });
  }
};
