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
  fromDate: string
): string => {
  const index = config.indexPattern(namespace);
  const maxActors = config.maxActorsPerSlice ?? COMPOSITE_PAGE_SIZE;

  // Actor-presence gate: mirrors the same logic as `build_targets_per_actor_query.ts`
  // so the probe and main query narrow on the same actor population.
  const actorPresenceFilter = config.customActor
    ? buildAnyActorFieldNonEmptyEsql(config.customActor.fields)
    : euid.esql.getEuidDocumentsContainsIdFilter('user');

  // Field evals (e.g. entity.namespace) are only needed when the standard user EUID expression
  // requires them. Skip when customActor.evalOverride provides a self-contained expression.
  const fieldEvals = !config.customActor?.evalOverride
    ? getFieldEvaluationsEsql('user')
    : undefined;
  const fieldEvalsLine = fieldEvals ? `| EVAL ${fieldEvals}` : undefined;

  // Actor EUID expression: use the custom override when provided, otherwise the standard
  // EUID evaluation for 'user' (same as `build_targets_per_actor_query.ts`).
  const actorEuidEval = config.customActor?.evalOverride
    ? `actorUserId = ${config.customActor.evalOverride}`
    : euid.esql.getEuidEvaluation('user', 'actorUserId', { withTypeId: true });

  // Integration-specific filter (event.action, event.outcome, etc.) — present on
  // standard/bucketed configs; override configs don't carry esqlWhereClause.
  const integrationFilter =
    'esqlWhereClause' in config && config.esqlWhereClause
      ? `    AND ${config.esqlWhereClause}`
      : undefined;

  const lines = [
    ESQL_ENGINE_PREAMBLE,
    `FROM ${index}`,
    `| WHERE @timestamp >= "${fromDate}" AND @timestamp < NOW()`,
    integrationFilter,
    `    AND (${actorPresenceFilter})`,
    `| SAMPLE ${SLICE_SAMPLE_PROBABILITY}`,
    fieldEvalsLine,
    `| EVAL ${actorEuidEval}`,
    `| WHERE COALESCE(actorUserId, "") != ""`,
    `| STATS _firstEvent = MIN(@timestamp) BY actorUserId`,
    `| SORT _firstEvent ASC`,
    `| LIMIT ${maxActors}`,
    `| STATS sliceBoundary = MAX(_firstEvent), actorCount = COUNT(*)`,
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
    return { sliceBoundary: null, isLastSlice: true };
  }

  const colIndex = (name: string): number => columns.findIndex((c) => c.name === name);
  const row = values[0];
  const sliceBoundary = row[colIndex('sliceBoundary')] as string | null;
  const actorCount = row[colIndex('actorCount')] as number;

  return {
    sliceBoundary: sliceBoundary ?? null,
    isLastSlice: actorCount < maxActors,
  };
};
