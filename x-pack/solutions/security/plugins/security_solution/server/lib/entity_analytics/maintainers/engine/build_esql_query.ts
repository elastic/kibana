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

function buildAccessesEsql(config: RelationshipIntegrationConfig, namespace: string): string {
  const indexPattern = config.indexPattern(namespace);
  const userFieldEvals = getFieldEvaluationsEsql('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');
  const hostIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('host');
  const actorEval = config.actorEvalOverride ?? euid.esql.getEuidEvaluation('user', { withTypeId: true });
  const targetEval = config.targetEvalOverride ?? euid.esql.getEuidEvaluation(config.targetEntityType, { withTypeId: true });
  const threshold = config.frequencyThreshold ?? DEFAULT_FREQUENCY_THRESHOLD;
  const additionalTargetFilter = config.additionalTargetFilter ? `\n    ${config.additionalTargetFilter}` : '';

  return `SET unmapped_fields="nullify";
FROM ${indexPattern}
| WHERE ${config.esqlWhereClause}
    AND event.outcome == "success"
    AND (${userIdFilter})
    AND (${hostIdFilter})
${userFieldEvalsLine}| EVAL actorUserId = ${actorEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = ${targetEval}
| MV_EXPAND targetEntityId
| WHERE targetEntityId IS NOT NULL AND targetEntityId != ""${additionalTargetFilter}
| STATS access_count = COUNT(*) BY actorUserId, targetEntityId
| EVAL access_type = CASE(
    access_count >= ${threshold}, "accesses_frequently",
    "accesses_infrequently"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, actorUserId
| STATS
    accesses_frequently   = VALUES(targets) WHERE access_type == "accesses_frequently",
    accesses_infrequently = VALUES(targets) WHERE access_type == "accesses_infrequently"
  BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

function buildCommunicatesWithEsql(config: RelationshipIntegrationConfig, namespace: string): string {
  const indexPattern = config.indexPattern(namespace);
  const userFieldEvals = getFieldEvaluationsEsql('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');

  const hostIdFilterLine =
    config.targetEntityType === 'host'
      ? `    AND (${euid.esql.getEuidDocumentsContainsIdFilter('host')})\n`
      : '';

  const actorEval = config.actorEvalOverride ?? euid.esql.getEuidEvaluation('user', { withTypeId: true });

  const defaultTargetEval = euid.esql.getEuidEvaluation(config.targetEntityType, { withTypeId: true });

  const targetEval = config.targetEvalOverride ?? defaultTargetEval;
  const additionalTargetFilter = config.additionalTargetFilter ? `\n    ${config.additionalTargetFilter}` : '';

  return `SET unmapped_fields="nullify";
FROM ${indexPattern}
| WHERE ${config.esqlWhereClause}
    AND (${userIdFilter})
${hostIdFilterLine}${userFieldEvalsLine}| EVAL actorUserId = ${actorEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = ${targetEval}
| MV_EXPAND targetEntityId
| WHERE targetEntityId IS NOT NULL AND targetEntityId != ""${additionalTargetFilter}
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

/**
 * Builds the ES|QL query for the given integration config.
 * If esqlQueryOverride is provided, delegates to it directly (azure_auditlogs uses this).
 */
export const buildEsqlQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string
): string => {
  if (config.esqlQueryOverride) {
    return config.esqlQueryOverride(namespace);
  }

  if (config.relationshipType === 'accesses') {
    return buildAccessesEsql(config, namespace);
  }

  return buildCommunicatesWithEsql(config, namespace);
};
