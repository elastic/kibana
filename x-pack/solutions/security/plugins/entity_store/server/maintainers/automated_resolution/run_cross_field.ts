/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { getLatestEntitiesIndexName } from '../../../common';
import type { CrossFieldRuleConfig } from './rules_config';
import type { PerRuleState, EntityHit } from './types';
import { cascadeLink } from './cascade';
import { selectTarget } from './run';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';

export interface RunCrossFieldRuleDeps {
  rule: CrossFieldRuleConfig;
  ruleState: PerRuleState;
  namespace: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  abortController: AbortController;
}

/**
 * Run a cross-field resolution rule using Pattern B:
 *   EVAL normalised_key = CASE(namespace == left, left_field, ...)
 *   STATS entity_ids BY normalised_key
 *
 * After ESQL returns candidate groups, the ambiguity-skip guard verifies
 * each group has exactly one entity per participating namespace before linking.
 *
 * CF1 does NOT use a watermark yet — it performs a full index scan every cycle.
 * A watermark based on `entity.lifecycle.last_seen` will be added in a future PR.
 */
export async function runCrossFieldRule({
  rule,
  ruleState,
  namespace,
  esClient,
  logger,
  abortController,
}: RunCrossFieldRuleDeps): Promise<PerRuleState> {
  const index = getLatestEntitiesIndexName(namespace);

  const candidateGroups = await queryCrossFieldCandidates(esClient, index, rule, logger);

  if (candidateGroups.length === 0) {
    logger.debug(`Rule ${rule.id}: no cross-field candidate groups found`);
    return {
      ...ruleState,
      lastRun: { resolutionsCreated: 0, skippedAmbiguousBuckets: 0 },
    };
  }

  logger.debug(`Rule ${rule.id}: ${candidateGroups.length} candidate groups`);

  if (abortController.signal.aborted) {
    logger.debug(`Rule ${rule.id}: aborted after ESQL query`);
    return ruleState;
  }

  let resolutionsCreated = 0;
  let skippedAmbiguousBuckets = 0;

  for (const group of candidateGroups) {
    try {
      const { entityIds, namespaces } = group;

      // Ambiguity-skip: require exactly one entity per participating namespace
      const leftEntities = entityIds.filter((_, i) => namespaces[i] === rule.leftNamespace);
      const rightEntities = entityIds.filter((_, i) => namespaces[i] === rule.rightNamespace);

      if (leftEntities.length !== 1 || rightEntities.length !== 1) {
        logger.warn(
          `Rule ${rule.id}: skipping ambiguous group (${leftEntities.length} left, ${rightEntities.length} right)`
        );
        skippedAmbiguousBuckets++;
        continue;
      }

      const entities: EntityHit[] = entityIds.map((id, i) => ({
        entityId: id,
        namespace: namespaces[i],
      }));

      const target = selectTarget(entities, rule.namespacePriority);
      const aliasIds = entityIds.filter((id) => id !== target.entityId);

      if (aliasIds.length === 0) continue;

      const result = await cascadeLink(esClient, index, target.entityId, aliasIds, logger);

      if (!result.cycleBlocked) {
        resolutionsCreated += result.resolutionsCreated;
        if (result.cascadeCount > 0) {
          logger.debug(
            `Rule ${rule.id}: cascade retargeted ${result.cascadeCount} entities → ${target.entityId}`
          );
        }
      }
    } catch (err) {
      logger.warn(
        `Rule ${rule.id}: failed to link cross-field group: ${(err as Error)?.message ?? err}`
      );
    }
  }

  logger.info(
    `Rule ${rule.id}: ${resolutionsCreated} resolutions created, ${skippedAmbiguousBuckets} ambiguous groups skipped`
  );

  return {
    ...ruleState,
    lastRun: { resolutionsCreated, skippedAmbiguousBuckets },
  };
}

interface CandidateGroup {
  entityIds: string[];
  namespaces: string[];
}

/**
 * Pattern B ESQL: EVAL + STATS BY normalised key.
 *
 * Returns entity groups where left-side and right-side entities share the
 * same normalised key value (e.g. UPN for CF1).
 */
async function queryCrossFieldCandidates(
  esClient: ElasticsearchClient,
  index: string,
  rule: CrossFieldRuleConfig,
  logger: Logger
): Promise<CandidateGroup[]> {
  const { leftField, leftNamespace, rightField, rightNamespace, entityType } = rule;

  const esql = [
    `FROM ${index}`,
    `| WHERE entity.namespace IN ("${leftNamespace}", "${rightNamespace}")`,
    `    AND ${ENGINE_METADATA_TYPE_FIELD} == "${entityType}"`,
    `    AND ${RESOLVED_TO_FIELD} IS NULL`,
    `| EVAL _cf_key = CASE(`,
    `    entity.namespace == "${leftNamespace}", TO_LOWER(${leftField}),`,
    `    entity.namespace == "${rightNamespace}", TO_LOWER(${rightField}),`,
    `    null`,
    `  )`,
    `| WHERE _cf_key IS NOT NULL`,
    `    AND NOT (entity.namespace == "${leftNamespace}" AND MV_COUNT(${leftField}) > 1)`,
    `| STATS entity_ids = VALUES(entity.id), namespaces = VALUES(entity.namespace) BY _cf_key`,
    `| WHERE MV_COUNT(entity_ids) >= 2`,
    `| KEEP _cf_key, entity_ids, namespaces`,
  ].join('\n');

  logger.debug(`Rule ${rule.id}: running ESQL cross-field query`);

  const response = await esClient.esql.query({
    query: esql,
    format: 'json',
  });

  const columns = response.columns.map((c) => c.name);
  const entityIdsCol = columns.indexOf('entity_ids');
  const namespacesCol = columns.indexOf('namespaces');

  if (entityIdsCol === -1 || namespacesCol === -1) {
    logger.warn(`Rule ${rule.id}: unexpected ESQL columns: ${columns.join(', ')}`);
    return [];
  }

  const groups: CandidateGroup[] = [];

  for (const row of response.values as FieldValue[][]) {
    const rawEntityIds = row[entityIdsCol];
    const rawNamespaces = row[namespacesCol];

    // ESQL returns multi-value fields as arrays; single values as scalars
    const entityIds: string[] = Array.isArray(rawEntityIds)
      ? rawEntityIds.map(String)
      : [String(rawEntityIds)];
    const namespaces: string[] = Array.isArray(rawNamespaces)
      ? rawNamespaces.map(String)
      : [String(rawNamespaces)];

    // VALUES() returns parallel arrays — entityIds[i] has namespace namespaces[i]
    if (entityIds.length !== namespaces.length) {
      logger.warn(
        `Rule ${rule.id}: entity_ids/namespaces array length mismatch in ESQL result row`
      );
      continue;
    }

    groups.push({ entityIds, namespaces });
  }

  return groups;
}
