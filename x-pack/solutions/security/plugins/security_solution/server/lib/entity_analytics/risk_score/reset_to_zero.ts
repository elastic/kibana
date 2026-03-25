/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { AssetCriticalityService } from '../asset_criticality';
import type { IdentitySourceFieldsMap, RiskScoreBucket } from '../types';
import {
  escapeEsqlStringLiteral,
  getOutputIdentifierField,
  parseIdentitySourceFields,
  processScores,
} from './helpers';
import { getIndexPatternDataStream } from './configurations';
import { persistRiskScoresToEntityStore } from './persist_risk_scores_to_entity_store';

export interface ResetToZeroDependencies {
  esClient: ElasticsearchClient;
  dataClient: RiskScoreDataClient;
  spaceId: string;
  entityType: EntityType;
  assetCriticalityService: AssetCriticalityService;
  logger: Logger;
  excludedEntities: string[];
  idBasedRiskScoringEnabled: boolean;
  entityStoreCRUDClient?: EntityStoreCRUDClient;
  refresh?: 'wait_for';
}

const RISK_SCORE_FIELD = 'risk.calculated_score_norm';
const RISK_SCORE_ID_VALUE_FIELD = 'risk.id_value';
interface EntityWithIdentity {
  idValue: string;
  euidFields?: IdentitySourceFieldsMap;
}

export const resetToZero = async ({
  esClient,
  dataClient,
  spaceId,
  entityType,
  assetCriticalityService,
  logger,
  refresh,
  excludedEntities,
  idBasedRiskScoringEnabled,
  entityStoreCRUDClient,
}: ResetToZeroDependencies): Promise<{ scoresWritten: number }> => {
  const { alias } = await getIndexPatternDataStream(spaceId);
  const identifierField = getOutputIdentifierField(entityType, idBasedRiskScoringEnabled);

  const entities = await fetchEntitiesWithNonZeroScores({
    esClient,
    logger,
    alias,
    entityType,
    excludedEntities,
    idBasedRiskScoringEnabled,
  });

  logger.trace(
    `Reset to zero fetched ${entityType} entities with non-zero scores: ${JSON.stringify(entities)}`
  );

  if (entities.length === 0) {
    return { scoresWritten: 0 };
  }

  const buckets = buildZeroScoreBuckets(entities, identifierField);

  const scores = await processScores({
    assetCriticalityService,
    buckets,
    identifierField,
    logger,
    now: new Date().toISOString(),
  });

  if (idBasedRiskScoringEnabled && entityStoreCRUDClient) {
    logger.trace(
      `Reset to zero persisting ${entityType} risk scores to entity store: ${JSON.stringify(
        scores
      )}`
    );
    const entityStoreErrors = await persistRiskScoresToEntityStore({
      entityStoreCRUDClient,
      logger,
      scores: { [entityType]: scores },
    });

    if (entityStoreErrors.length > 0) {
      logger.warn(
        `Entity store v2 write had ${
          entityStoreErrors.length
        } error(s) during reset: ${entityStoreErrors.join('; ')}`
      );
    }
  }

  const writer = await dataClient.getWriter({ namespace: spaceId });
  await writer.bulk({ [entityType]: scores, refresh }).catch((e) => {
    logger.error(`Error resetting ${entityType} risk scores to zero: ${e.message}`);
    throw e;
  });

  return { scoresWritten: scores.length };
};

/**
 * Query the risk score index for entities with non-zero scores that were NOT part of the
 * current scoring run (i.e. not in `excludedEntities`). These need to be reset to zero.
 *
 * The `id_value` field in the risk index already contains the correct identifier for both
 * V1 (entity name like "server-1") and V2 (EUID like "host:server-1"). No runtime mapping
 * is needed here because the EUID was computed and persisted during the scoring phase.
 */
const fetchEntitiesWithNonZeroScores = async ({
  esClient,
  logger,
  alias,
  entityType,
  excludedEntities,
  idBasedRiskScoringEnabled,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  alias: string;
  entityType: EntityType;
  excludedEntities: string[];
  idBasedRiskScoringEnabled: boolean;
}): Promise<EntityWithIdentity[]> => {
  const entityField = `${entityType}.${RISK_SCORE_ID_VALUE_FIELD}`;
  const euidFieldsPresenceClause = idBasedRiskScoringEnabled
    ? // NOTE: When V2 is enabled, only reset docs that have euid_fields_raw persisted.
      // This intentionally excludes legacy/V1 scores (without euid_fields_raw), which
      // therefore will no longer be reset to zero by this V2 path.
      `AND ${entityType}.risk.euid_fields_raw IS NOT NULL`
    : '';
  const excludedEntitiesClause =
    excludedEntities.length > 0
      ? `AND id_value NOT IN (${excludedEntities
          .map((e) => `"${escapeEsqlStringLiteral(e)}"`)
          .join(',')})`
      : '';

  const esql = /* ESQL */ `
    FROM ${alias}
    | WHERE ${entityType}.${RISK_SCORE_FIELD} > 0
    | EVAL id_value = TO_STRING(${entityField})
    | WHERE id_value IS NOT NULL AND id_value != "" ${euidFieldsPresenceClause} ${excludedEntitiesClause}
    | EVAL euid_fields_raw = TO_STRING(${entityType}.risk.euid_fields_raw)
    | SORT @timestamp DESC
    | KEEP id_value, euid_fields_raw
    `;

  logger.trace(`Reset to zero ESQL query:\n${esql}`);

  const response = await esClient.esql.query({ query: esql }).catch((e) => {
    logger.error(
      `Error executing ESQL query to reset ${entityType} risk scores to zero: ${e.message}`
    );
    logger.debug(
      `Full reset-to-zero query error: ${JSON.stringify(e?.body?.error?.root_cause || e)}`
    );
    throw e;
  });

  logger.trace(`Reset to zero ESQL response:\n${JSON.stringify(response)}`);

  const seenEntities = new Set<string>();
  return response.values.reduce<EntityWithIdentity[]>((acc, row) => {
    const [idValue, euidFieldsRaw] = row;
    if (typeof idValue === 'string' && idValue !== '' && !seenEntities.has(idValue)) {
      seenEntities.add(idValue);
      acc.push({
        idValue,
        euidFields: parseIdentitySourceFields(euidFieldsRaw),
      });
    }
    return acc;
  }, []);
};

const buildZeroScoreBuckets = (
  entities: EntityWithIdentity[],
  identifierField: string
): RiskScoreBucket[] =>
  entities.map(({ idValue, euidFields }) => ({
    key: { [identifierField]: idValue },
    doc_count: 0,
    top_inputs: {
      doc_count: 0,
      risk_details: {
        value: {
          score: 0,
          normalized_score: 0,
          notes: [],
          category_1_score: 0,
          category_1_count: 0,
          risk_inputs: [],
        },
      },
    },
    ...(euidFields ? { euid_fields: euidFields } : {}),
  }));
