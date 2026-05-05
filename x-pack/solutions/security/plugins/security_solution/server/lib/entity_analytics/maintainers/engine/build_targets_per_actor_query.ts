/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';

import type {
  RelationshipIntegrationConfig,
  StandardRelationshipIntegrationConfig,
  BucketedRelationshipIntegrationConfig,
} from './types';
import { COMPOSITE_PAGE_SIZE, ESQL_ENGINE_PREAMBLE } from './constants';
import { ENGINE_COLUMNS } from './columns';

function buildRelationshipEsql(
  config: StandardRelationshipIntegrationConfig | BucketedRelationshipIntegrationConfig,
  namespace: string
): string {
  const indexPattern = config.indexPattern(namespace);
  // TODO(follow-up): 'user' hardcoded for actor — thread actorEntityType through config.
  const userFieldEvals = !config.customActor?.evalOverride
    ? getFieldEvaluationsEsql('user')
    : undefined;
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');
  const actorEval =
    config.customActor?.evalOverride ?? euid.esql.getEuidEvaluation('user', { withTypeId: true });
  const targetEval =
    config.targetEvalOverride ??
    euid.esql.getEuidEvaluation(config.targetEntityType, { withTypeId: true });
  const additionalTargetFilter = config.additionalTargetFilter
    ? `\n    ${config.additionalTargetFilter}`
    : '';

  const targetIdFilterLine = config.requireTargetEntityIdExists
    ? `    AND (${euid.esql.getEuidDocumentsContainsIdFilter(config.targetEntityType)})\n`
    : '';

  const statsClause =
    config.kind === 'bucketed'
      ? (() => {
          const {
            threshold,
            aboveThresholdRelationship: above,
            belowThresholdRelationship: below,
          } = config.bucketTargetByThreshold;
          const aboveCol = ENGINE_COLUMNS.bucketAbove(above);
          const belowCol = ENGINE_COLUMNS.bucketBelow(below);
          return `| STATS access_count = COUNT(*) BY ${ENGINE_COLUMNS.actor}, targetEntityId
| EVAL access_type = CASE(
    access_count >= ${threshold}, "${above}",
    "${below}"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, ${ENGINE_COLUMNS.actor}
| STATS
    ${aboveCol} = VALUES(targets) WHERE access_type == "${above}",
    ${belowCol} = VALUES(targets) WHERE access_type == "${below}"
  BY ${ENGINE_COLUMNS.actor}`;
        })()
      : `| STATS ${ENGINE_COLUMNS.flat(config.relationshipKey)} = VALUES(targetEntityId) BY ${
          ENGINE_COLUMNS.actor
        }`;

  // NOTE: We use `COALESCE(col, "") != ""` rather than the more natural
  // `col IS NOT NULL AND col != ""` because ES|QL has a quirk where
  // `WHERE col IS NOT NULL` evaluates to FALSE for all rows when `col` is
  // produced by a CONCAT() over a CASE() expression with nested CASE arms
  // (as our user EUID actorEval does). That would silently drop every row
  // from the pipeline. COALESCE is semantically equivalent to the original
  // intent (treat NULL as empty, then check non-empty) and sidesteps the bug.
  return `FROM ${indexPattern}
| WHERE ${config.esqlWhereClause}
    AND (${userIdFilter})
${targetIdFilterLine}${userFieldEvalsLine}| EVAL ${ENGINE_COLUMNS.actor} = ${actorEval}
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
| EVAL targetEntityId = ${targetEval}
| MV_EXPAND targetEntityId
| WHERE COALESCE(targetEntityId, "") != ""${additionalTargetFilter}
${statsClause}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

/**
 * Builds the ES|QL query for the given integration config.
 *
 * The engine always prepends `ESQL_ENGINE_PREAMBLE` to the result so that
 * `IS NOT NULL` / `COALESCE` semantics are consistent across queries —
 * override authors cannot accidentally omit it.
 *
 * - `kind: 'override'` → delegates the body to `config.esqlQueryOverride(namespace)`.
 *   The override must emit columns `actorUserId` and `<relationshipKey>`
 *   (e.g. `communicates_with`); mismatched column names produce silent empty
 *   results (see `parseTargetsPerActorRows` for the warning safety net).
 *   Override functions MUST NOT include `SET unmapped_fields="nullify"`
 *   themselves — the engine prepends it.
 * - `kind: 'standard' | 'bucketed'` → uses the default ES|QL builder.
 */
export const buildTargetsPerActorQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string
): string => {
  const body =
    config.kind === 'override'
      ? config.esqlQueryOverride(namespace)
      : buildRelationshipEsql(config, namespace);
  return `${ESQL_ENGINE_PREAMBLE}\n${body}`;
};
