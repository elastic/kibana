/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import {
  EntityIdentifierFields,
  EntityTypeToIdentifierField,
  type EntityType,
} from '../../../../common/entity_analytics/types';
import type { ExperimentalFeatures } from '../../../../common';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { AssetCriticalityService } from '../asset_criticality';
import type { PrivmonUserCrudService } from '../privilege_monitoring/users/privileged_users_crud';
import type { RiskScoreBucket } from '../types';
import { applyScoreModifiers } from './apply_score_modifiers';
import { getIndexPatternDataStream } from './configurations';
import { persistRiskScoresToEntityStore } from './persist_risk_scores_to_entity_store';

export interface ResetToZeroDependencies {
  esClient: ElasticsearchClient;
  dataClient: RiskScoreDataClient;
  spaceId: string;
  entityType: EntityType;
  assetCriticalityService: AssetCriticalityService;
  privmonUserCrudService: PrivmonUserCrudService;
  experimentalFeatures: ExperimentalFeatures;
  logger: Logger;
  excludedEntities: string[];
  idBasedRiskScoringEnabled: boolean;
  crudClient?: EntityStoreCRUDClient;
  refresh?: 'wait_for';
}

const RISK_SCORE_FIELD = 'risk.calculated_score_norm';
const RISK_SCORE_ID_VALUE_FIELD = 'risk.id_value';
const RESET_BATCH_LIMIT = 10000;

export const resetToZero = async ({
  esClient,
  dataClient,
  spaceId,
  entityType,
  assetCriticalityService,
  privmonUserCrudService,
  experimentalFeatures,
  logger,
  refresh,
  excludedEntities,
  idBasedRiskScoringEnabled,
  crudClient,
}: ResetToZeroDependencies): Promise<{ scoresWritten: number }> => {
  const { alias } = await getIndexPatternDataStream(spaceId);
  const entityField = `${entityType}.${RISK_SCORE_ID_VALUE_FIELD}`;
  const identifierField = idBasedRiskScoringEnabled
    ? EntityIdentifierFields.generic
    : EntityTypeToIdentifierField[entityType];
  const esql = /* sql */ `
    FROM ${alias}
    | WHERE ${entityType}.${RISK_SCORE_FIELD} > 0
    | EVAL id_value = TO_STRING(${entityField})
    | WHERE id_value IS NOT NULL AND id_value != ""
    | STATS count = count(id_value) BY id_value
    | KEEP id_value
    // Intentionally bounded per run; additional stale entities are drained by
    // subsequent scheduled runs.
    | LIMIT ${RESET_BATCH_LIMIT}
    `;

  logger.debug(`Reset to zero ESQL query:\n${esql}`);

  const exclusionFilter =
    excludedEntities.length > 0
      ? { bool: { must_not: [{ terms: { [identifierField]: excludedEntities } }] } }
      : undefined;

  const response = await esClient.esql
    .query({
      query: esql,
      ...(exclusionFilter ? { filter: exclusionFilter } : {}),
    })
    .catch((e) => {
      logger.error(
        `Error executing ESQL query to reset ${entityType} risk scores to zero: ${e.message}`
      );
      throw e;
    });

  const entities = (response.values ?? [])
    .map((row: unknown[]) => (row as string[])[0])
    .filter((entity): entity is string => typeof entity === 'string' && entity !== '');
  if (entities.length === RESET_BATCH_LIMIT) {
    logger.debug(
      `Reset to zero reached batch limit (${RESET_BATCH_LIMIT}); remaining stale entities will be reset in subsequent runs`
    );
  }

  const buckets: RiskScoreBucket[] = entities.map((entity) => {
    const bucket: RiskScoreBucket = {
      key: { [identifierField]: entity },
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
    };
    return bucket;
  });

  const scores = await applyScoreModifiers({
    now: new Date().toISOString(),
    identifierType: entityType,
    deps: { assetCriticalityService, privmonUserCrudService, logger },
    page: {
      buckets,
      bounds: { lower: '*' },
      identifierField,
    },
    experimentalFeatures,
  });

  const writer = await dataClient.getWriter({ namespace: spaceId });
  await writer.bulk({ [entityType]: scores, refresh }).catch((e) => {
    logger.error(`Error resetting ${entityType} risk scores to zero: ${e.message}`);
    throw e;
  });

  if (idBasedRiskScoringEnabled && crudClient) {
    const entityStoreErrors = await persistRiskScoresToEntityStore({
      crudClient,
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

  return { scoresWritten: scores.length };
};
