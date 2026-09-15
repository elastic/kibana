/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { RiskScoresPreviewResponse } from '../../../../../common/api/entity_analytics';
import type { CalculateScoresParams } from '../../types';
import type { EntityType } from '../../../../../common/search_strategy';
import { getEntityAnalyticsEntityTypes } from '../../../../../common/entity_analytics/utils';
import {
  getEuidCompositeQuery,
  getBaseScoreESQL,
  type EuidCompositeAggregation,
} from '../calculate_esql_risk_scores';
import { parseEsqlBaseScoreRow } from '../maintainer/steps/parse_esql_row';
import { fetchEntitiesByIds } from '../maintainer/utils/fetch_entities_by_ids';
import { applyScoreModifiersFromEntities } from '../modifiers/apply_modifiers_from_entities';
import { fetchWatchlistConfigs } from '../maintainer/utils/fetch_watchlist_configs';
import { buildCommonAlertFilters } from '../maintainer/steps/build_alert_filters';

interface CalculateScoresWithESQLV2Params extends CalculateScoresParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  crudClient: EntityUpdateClient;
  soClient: SavedObjectsClientContract;
  namespace: string;
}

const ENTITY_ID_FIELD = 'entity.id';

const getEntityAfterKey = (
  afterKey: Record<string, string> | undefined
): Record<string, string> | undefined => {
  if (!afterKey) return undefined;

  if (typeof afterKey.entity_id === 'string') {
    return { entity_id: afterKey.entity_id };
  }

  const entityIdValue = afterKey[ENTITY_ID_FIELD];
  if (typeof entityIdValue === 'string') {
    return { entity_id: entityIdValue };
  }

  return undefined;
};

const toResponseAfterKey = (
  afterKey: Record<string, string> | undefined
): Record<string, string> => {
  if (!afterKey?.entity_id) {
    return {};
  }

  return { [ENTITY_ID_FIELD]: afterKey.entity_id };
};

export const calculateScoresWithESQLV2 = async ({
  afterKeys,
  identifierType,
  index,
  pageSize,
  range,
  runtimeMappings,
  filter,
  weights,
  alertSampleSizePerShard,
  excludeAlertStatuses,
  excludeAlertTags,
  filters,
  esClient,
  logger,
  crudClient,
  soClient,
  namespace,
}: CalculateScoresWithESQLV2Params): Promise<RiskScoresPreviewResponse> => {
  const now = new Date().toISOString();
  const sampleSize = alertSampleSizePerShard ?? 10000;
  const identifierTypes: EntityType[] = identifierType
    ? [identifierType]
    : getEntityAnalyticsEntityTypes();
  const watchlistConfigs = await fetchWatchlistConfigs({ soClient, esClient, namespace, logger });

  const response: RiskScoresPreviewResponse = { after_keys: {}, scores: {} };

  for (const currentEntityType of identifierTypes) {
    const entityAfterKey = getEntityAfterKey(afterKeys[currentEntityType]);
    const entityFilters = buildCommonAlertFilters(
      {
        range,
        filter,
        excludeAlertStatuses,
        excludeAlertTags,
        filters,
      },
      currentEntityType
    );

    const compositeResponse = await esClient.search(
      getEuidCompositeQuery(currentEntityType, entityFilters, {
        index,
        pageSize,
        afterKey: entityAfterKey,
        runtimeMappings,
      })
    );

    const compositeAgg = (
      compositeResponse.aggregations as { by_entity_id?: EuidCompositeAggregation } | undefined
    )?.by_entity_id;
    const buckets = compositeAgg?.buckets ?? [];
    response.after_keys[currentEntityType] = toResponseAfterKey(compositeAgg?.after_key);

    if (buckets.length === 0) {
      response.scores[currentEntityType] = [];
    } else {
      const upper = buckets[buckets.length - 1].key.entity_id;
      const query = getBaseScoreESQL(
        currentEntityType,
        { lower: entityAfterKey?.entity_id, upper },
        sampleSize,
        pageSize,
        index
      );
      const esqlResponse = await esClient.esql.query({
        query,
        filter: { bool: { filter: entityFilters } },
      });
      const baseScores = (esqlResponse.values ?? []).map(parseEsqlBaseScoreRow(index));
      const entityIds = baseScores.map((score) => score.entity_id);
      const entities = await fetchEntitiesByIds({
        crudClient,
        entityIds,
        logger,
        errorContext:
          'Error fetching entities for preview scoring. Scores for entities that cannot be resolved from the store will be discarded',
      });
      const knownEntityIds = new Set(entities.keys());
      const inStoreBaseScores = baseScores.filter((score) => knownEntityIds.has(score.entity_id));

      const scores = applyScoreModifiersFromEntities({
        now,
        identifierType: currentEntityType,
        scoreType: 'base',
        weights,
        page: {
          scores: inStoreBaseScores,
          identifierField: 'entity.id',
        },
        entities,
        watchlistConfigs,
      }).map((score) => ({
        ...score,
        id_field: ENTITY_ID_FIELD,
        id_value: score.id_value,
      }));

      response.scores[currentEntityType] = scores;
    }
  }

  return response;
};
