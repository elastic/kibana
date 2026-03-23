/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';

import {
  buildEntityNameFilter,
  getRiskIndex,
  type EntityType,
} from '../../../../common/search_strategy/security_solution';
import { buildRiskScoreQuery } from '../../../search_strategy/security_solution/factory/risk_score/all/query.risk_score.dsl';

export const createGetRiskScores =
  ({
    logger,
    esClient,
    spaceId,
  }: {
    logger: Logger;
    esClient: ElasticsearchClient;
    spaceId: string;
  }) =>
  async ({
    entityIdentifier,
    entityType,
    pagination,
  }: {
    entityType: EntityType;
    entityIdentifier: string;
    pagination?: {
      querySize: number;
      cursorStart: number;
    };
  }): Promise<EntityRiskScoreRecord[]> => {
    const query = buildRiskScoreQuery({
      filterQuery: buildEntityNameFilter(entityType, [entityIdentifier]),
      defaultIndex: [getRiskIndex(spaceId, false)],
      pagination,
      riskScoreEntity: entityType,
    });

    const response = await esClient.search<Record<EntityType, { risk: EntityRiskScoreRecord }>>(
      query
    );

    return response.hits.hits
      .map((hit) => (hit._source ? hit._source[entityType].risk : undefined))
      .filter((risk): risk is EntityRiskScoreRecord => risk !== undefined);
  };
