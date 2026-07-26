/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';

import type { RelationshipIntegrationConfig } from './types';
import { ESQL_ENGINE_PREAMBLE } from './constants';

/**
 * "At least one of these fields exists and is non-empty" ES|QL fragment.
 *
 * Mirrors the same helper in `build_actor_slice_probe_query.ts` so the
 * boundary extension query and the probe apply the same actor-presence gate.
 */
const buildAnyActorFieldNonEmptyEsql = (fields: string[]): string =>
  fields.map((f) => `(\`${f}\` IS NOT NULL AND \`${f}\` != "")`).join(' OR ');

/**
 * Builds the ES|QL boundary extension query that finds the true last event
 * timestamp (`MAX(@timestamp)`) for all actors whose first event falls within
 * the probe's slice boundary.
 *
 * The result rows contain one column:
 * - `extendedSliceEnd` (date): MAX of the last event across qualifying actors,
 *   or NULL if no actors match.
 *
 * Call `parseActorSliceBoundaryResult` to turn the ES|QL response into a
 * timestamp string or null.
 */
export const buildActorSliceBoundaryQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string,
  fromDate: string,
  sliceBoundary: string
): string => {
  const index = config.indexPattern(namespace);

  // Actor-presence gate: mirrors the same logic as `build_actor_slice_probe_query.ts`
  // so the boundary extension query and probe narrow on the same actor population.
  // TODO(#266748): 'user' hardcoded for actor — thread actorEntityType through config.
  const actorPresenceFilter = config.customActor
    ? buildAnyActorFieldNonEmptyEsql(config.customActor.fields)
    : euid.esql.getEuidDocumentsContainsIdFilter('user');

  // When probeActorKey is set, use the cheap expression instead of the full EUID
  // chain — same rationale as `build_actor_slice_probe_query.ts`. The boundary
  // query only needs to count/group actors to find MAX(@timestamp); it does not
  // produce EUIDs that are written anywhere.
  const probeActorKey = config.customActor?.probeActorKey;
  const useProbeKey = probeActorKey != null;

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
    fieldEvalsLine,
    `| EVAL ${actorEuidEval}`,
    `| WHERE COALESCE(actorUserId, "") != ""`,
    `| STATS _firstEvent = MIN(@timestamp), _lastEvent = MAX(@timestamp) BY actorUserId`,
    `| WHERE _firstEvent <= "${sliceBoundary}"`,
    `| STATS extendedSliceEnd = MAX(_lastEvent)`,
  ].filter((line): line is string => line !== undefined);

  return lines.join('\n');
};

/**
 * Parses the ES|QL response from a boundary extension query into an ISO
 * timestamp string, or null if no qualifying actors were found.
 *
 * @param columns - The columns array from the ES|QL response.
 * @param values  - The values array from the ES|QL response.
 */
export const parseActorSliceBoundaryResult = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][]
): string | null => {
  if (values.length === 0) return null;
  const colIndex = columns.findIndex((c) => c.name === 'extendedSliceEnd');
  const value = (values[0] as unknown[])[colIndex];
  return typeof value === 'string' ? value : null;
};
