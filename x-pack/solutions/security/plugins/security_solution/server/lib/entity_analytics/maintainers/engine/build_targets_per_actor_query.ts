/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';

import type { RelationshipIntegrationConfig } from './types';
import { COMPOSITE_PAGE_SIZE } from './constants';

const DEFAULT_FREQUENCY_THRESHOLD = 4;

function buildRelationshipEsql(config: RelationshipIntegrationConfig, namespace: string): string {
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

  const outcomeFilterLine = config.enableFrequencyClassification
    ? `    AND event.outcome == "success"\n`
    : '';
  const hostIdFilterLine =
    config.targetEntityType === 'host'
      ? `    AND (${euid.esql.getEuidDocumentsContainsIdFilter('host')})\n`
      : '';

  const statsClause = config.enableFrequencyClassification
    ? (() => {
        const threshold = config.frequencyThreshold ?? DEFAULT_FREQUENCY_THRESHOLD;
        return `| STATS access_count = COUNT(*) BY actorUserId, targetEntityId
| EVAL access_type = CASE(
    access_count >= ${threshold}, "accesses_frequently",
    "accesses_infrequently"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, actorUserId
| STATS
    accesses_frequently   = VALUES(targets) WHERE access_type == "accesses_frequently",
    accesses_infrequently = VALUES(targets) WHERE access_type == "accesses_infrequently"
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
${outcomeFilterLine}    AND (${userIdFilter})
${hostIdFilterLine}${userFieldEvalsLine}| EVAL actorUserId = ${actorEval}
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
 * If esqlQueryOverride is provided, delegates to it directly.
 * NOTE: overrides must emit columns named `actorUserId` plus either
 * `accesses_frequently` + `accesses_infrequently` (when enableFrequencyClassification is true)
 * or `<relationshipType>` (e.g. `communicates_with`) otherwise. Mismatched column names
 * produce silent empty results.
 */
export const buildTargetsPerActorQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string
): string => {
  if (config.esqlQueryOverride) {
    return config.esqlQueryOverride(namespace);
  }

  return buildRelationshipEsql(config, namespace);
};
