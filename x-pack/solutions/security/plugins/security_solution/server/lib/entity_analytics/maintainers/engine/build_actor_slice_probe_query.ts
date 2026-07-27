/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';

import type { RelationshipIntegrationConfig } from './types';
import { COMPOSITE_PAGE_SIZE, ESQL_ENGINE_PREAMBLE, SLICE_SAMPLE_PROBABILITY } from './constants';

/**
 * "At least one of these fields exists and is non-empty" ES|QL fragment.
 *
 * Matches the same pattern used by `buildAnyActorFieldNonEmptyEsql` in
 * `build_targets_per_actor_query.ts` so the probe and the main query
 * apply the same actor-presence gate when `customActor.fields` is set.
 */
const buildAnyActorFieldNonEmptyEsql = (fields: string[]): string =>
  fields.map((f) => `(\`${f}\` IS NOT NULL AND \`${f}\` != "")`).join(' OR ');

export interface ActorSliceProbeResult {
  /** ISO timestamp of the ~Nth actor's first event; null if no actors found. */
  sliceBoundary: string | null;
  /** true when actorCount < maxActors, meaning no more slices are needed. */
  isLastSlice: boolean;
  /** Actor IDs (probe keys) found in this slice — used to filter the extract query. */
  actorIds: string[];
}

/**
 * Builds the ES|QL probe query that finds the timestamp boundary where approximately
 * `maxActorsPerSlice` distinct actors appear, using SAMPLE to keep the probe cheap.
 *
 * The result rows contain two columns:
 * - `sliceBoundary` (date): MAX(@timestamp) of the Nth actor's first event
 * - `actorCount` (long): number of distinct actors found in the sample
 *
 * Call `parseActorSliceProbeResult` to turn the ES|QL response into an `ActorSliceProbeResult`.
 */
export const buildActorSliceProbeQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string,
  fromDate: string,
  useSample: boolean = true
): string => {
  const index = config.indexPattern(namespace);
  const maxActors = config.maxActorsPerSlice ?? COMPOSITE_PAGE_SIZE;

  // Actor-presence gate: mirrors the same logic as `build_targets_per_actor_query.ts`
  // so the probe and main query narrow on the same actor population.
  // TODO(#266748): 'user' hardcoded for actor — thread actorEntityType through config.
  const actorPresenceFilter = config.customActor
    ? buildAnyActorFieldNonEmptyEsql(config.customActor.fields)
    : euid.esql.getEuidDocumentsContainsIdFilter('user');

  // Integration-specific filter (event.action, event.outcome, etc.) — present on
  // standard/bucketed configs; override configs don't carry esqlWhereClause.
  const integrationFilter =
    'esqlWhereClause' in config && config.esqlWhereClause
      ? `    AND ${config.esqlWhereClause}`
      : undefined;

  // When probeActorKey is set, skip the full EUID eval chain (entity.namespace
  // resolution + multi-field COALESCE) and use the cheaper expression instead.
  // The probe only counts distinct actors to find a time boundary — it does not
  // need a fully-qualified EUID. This can reduce probe time significantly on
  // large indices (e.g. 30s → 4s on 748M docs with SAMPLE 0.1).
  const probeActorKey = config.customActor?.probeActorKey;
  const useProbeKey = probeActorKey != null;

  // Full EUID eval path (used when no probeActorKey is set).
  // TODO(#266748): 'user' hardcoded for actor — thread actorEntityType through config.
  const fieldEvals =
    !useProbeKey && !config.customActor?.evalOverride ? getFieldEvaluationsEsql('user') : undefined;
  const fieldEvalsLine = fieldEvals ? `| EVAL ${fieldEvals}` : undefined;
  // TODO(#266748): 'user' hardcoded for actor — thread actorEntityType through config.
  const actorEuidEval = useProbeKey
    ? `actorUserId = ${probeActorKey}`
    : config.customActor?.evalOverride
    ? `actorUserId = ${config.customActor.evalOverride}`
    : euid.esql.getEuidEvaluation('user', 'actorUserId', { withTypeId: true });

  const lines = [
    ESQL_ENGINE_PREAMBLE,
    `FROM ${index}`,
    `| WHERE @timestamp >= "${fromDate}" AND @timestamp < NOW()`,
    integrationFilter,
    `    AND (${actorPresenceFilter})`,
    useSample ? `| SAMPLE ${SLICE_SAMPLE_PROBABILITY}` : undefined,
    fieldEvalsLine,
    `| EVAL ${actorEuidEval}`,
    `| WHERE COALESCE(actorUserId, "") != ""`,
    `| STATS _firstEvent = MIN(@timestamp) BY actorUserId`,
    `| SORT _firstEvent ASC`,
    `| LIMIT ${maxActors}`,
    `| STATS sliceBoundary = MAX(_firstEvent), actorCount = COUNT(*), actorIds = VALUES(actorUserId)`,
  ].filter((line): line is string => line !== undefined);

  return lines.join('\n');
};

/**
 * Parses the ES|QL response from a probe query into an `ActorSliceProbeResult`.
 *
 * @param columns - The columns array from the ES|QL response.
 * @param values  - The values array from the ES|QL response.
 * @param maxActors - The effective limit used in the probe (config.maxActorsPerSlice ?? COMPOSITE_PAGE_SIZE).
 *                    `isLastSlice` is true when actorCount < maxActors.
 */
export const parseActorSliceProbeResult = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][],
  maxActors: number
): ActorSliceProbeResult => {
  if (values.length === 0) {
    return { sliceBoundary: null, isLastSlice: true, actorIds: [] };
  }

  const colIndex = (name: string): number => columns.findIndex((c) => c.name === name);
  const row = values[0];
  const sliceBoundary = row[colIndex('sliceBoundary')] as string | null;
  const actorCount = row[colIndex('actorCount')] as number;
  const rawActorIds = row[colIndex('actorIds')];
  const actorIds: string[] = Array.isArray(rawActorIds)
    ? (rawActorIds as unknown[]).filter((v): v is string => typeof v === 'string')
    : typeof rawActorIds === 'string'
    ? [rawActorIds]
    : [];

  return {
    sliceBoundary: sliceBoundary ?? null,
    isLastSlice: actorCount < maxActors,
    actorIds,
  };
};
