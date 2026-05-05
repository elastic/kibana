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
import { COMPOSITE_PAGE_SIZE } from './constants';

function buildRelationshipEsql(
  config: StandardRelationshipIntegrationConfig | BucketedRelationshipIntegrationConfig,
  namespace: string
): string {
  const indexPattern = config.indexPattern(namespace);
  // TODO(follow-up): 'user' hardcoded for actor — thread actorEntityType through config.
  const userFieldEvals = !config.actorEvalOverride ? getFieldEvaluationsEsql('user') : undefined;
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');
  const actorEval =
    config.actorEvalOverride ?? euid.esql.getEuidEvaluation('user', { withTypeId: true });
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
          return `| STATS access_count = COUNT(*) BY actorUserId, targetEntityId
| EVAL access_type = CASE(
    access_count >= ${threshold}, "${above}",
    "${below}"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, actorUserId
| STATS
    ${above} = VALUES(targets) WHERE access_type == "${above}",
    ${below} = VALUES(targets) WHERE access_type == "${below}"
  BY actorUserId`;
        })()
      : `| STATS ${config.relationshipType} = VALUES(targetEntityId) BY actorUserId`;

  // NOTE: We use `COALESCE(col, "") != ""` rather than the more natural
  // `col IS NOT NULL AND col != ""` because ES|QL has a quirk where
  // `WHERE col IS NOT NULL` evaluates to FALSE for all rows when `col` is
  // produced by a CONCAT() over a CASE() expression with nested CASE arms
  // (as our user EUID actorEval does). That would silently drop every row
  // from the pipeline. COALESCE is semantically equivalent to the original
  // intent (treat NULL as empty, then check non-empty) and sidesteps the bug.
  return `SET unmapped_fields="nullify";
FROM ${indexPattern}
| WHERE ${config.esqlWhereClause}
    AND (${userIdFilter})
${targetIdFilterLine}${userFieldEvalsLine}| EVAL actorUserId = ${actorEval}
| WHERE COALESCE(actorUserId, "") != ""
| EVAL targetEntityId = ${targetEval}
| MV_EXPAND targetEntityId
| WHERE COALESCE(targetEntityId, "") != ""${additionalTargetFilter}
${statsClause}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

/**
 * Builds the ES|QL query for the given integration config.
 *
 * - `kind: 'override'` → delegates to `config.esqlQueryOverride(namespace)`.
 *   The override must emit columns `actorUserId` and `<relationshipType>`
 *   (e.g. `communicates_with`); mismatched column names produce silent empty
 *   results (see `parseTargetsPerActorRows` for the warning safety net).
 * - `kind: 'standard' | 'bucketed'` → uses the default ES|QL builder.
 */
export const buildTargetsPerActorQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string
): string => {
  if (config.kind === 'override') {
    return config.esqlQueryOverride(namespace);
  }

  return buildRelationshipEsql(config, namespace);
};
