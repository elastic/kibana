/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  EntityTypeToIdentifierField,
  type EntityType,
} from '../../../../common/entity_analytics/types';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { AssetCriticalityService } from '../asset_criticality';
import type { RiskScoreBucket } from '../types';
import { processScores } from './helpers';
import { getIndexPatternDataStream } from './configurations';

export interface ResetToZeroDependencies {
  esClient: ElasticsearchClient;
  dataClient: RiskScoreDataClient;
  spaceId: string;
  entityType: EntityType;
  assetCriticalityService: AssetCriticalityService;
  logger: Logger;
  excludedEntities: string[];
  refresh?: 'wait_for';
}

const RISK_SCORE_FIELD = 'risk.calculated_score_norm';

export const resetToZero = async ({
  esClient,
  dataClient,
  spaceId,
  entityType,
  assetCriticalityService,
  logger,
  refresh,
  excludedEntities,
}: ResetToZeroDependencies): Promise<{ scoresWritten: number }> => {
  const { alias } = await getIndexPatternDataStream(spaceId);
  const entityField = EntityTypeToIdentifierField[entityType];
  const excludedEntitiesClause = `AND ${entityField} NOT IN (${excludedEntities
    .map((e) => `"${e}"`)
    .join(',')})`;
  const esql = /* sql */ `
    FROM ${alias} 
    | WHERE ${entityType}.${RISK_SCORE_FIELD} > 0 ${
    excludedEntities.length > 0 ? excludedEntitiesClause : ''
  }
    | STATS count = count(${entityField}) BY ${entityField}
    | KEEP ${entityField}
    `;

  logger.debug(`Reset to zero ESQL query:\n${esql}`);

  const response = await esClient.esql
    .query({
      query: esql,
    })
    .catch((e) => {
      logger.error(
        `Error executing ESQL query to reset ${entityType} risk scores to zero: ${e.message}`
      );
      throw e;
    });

  const buckets: RiskScoreBucket[] = response.values.map((row) => {
    const [entity] = row;
    if (typeof entity !== 'string') {
      throw new Error(`Invalid entity value: ${entity}`);
    }

    const bucket: RiskScoreBucket = {
      key: { [EntityTypeToIdentifierField[entityType]]: entity },
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

  const scores = await processScores({
    assetCriticalityService,
    buckets,
    identifierField: EntityTypeToIdentifierField[entityType],
    logger,
    now: new Date().toISOString(),
  });

  const writer = await dataClient.getWriter({ namespace: spaceId });
  await writer.bulk({ [entityType]: scores, refresh }).catch((e) => {
    logger.error(`Error resetting ${entityType} risk scores to zero: ${e.message}`);
    throw e;
  });

  return { scoresWritten: scores.length };
};
