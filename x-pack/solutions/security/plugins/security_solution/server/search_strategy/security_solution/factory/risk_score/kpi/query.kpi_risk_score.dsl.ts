/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchRequestParams } from '@kbn/search-types';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { EntityTypeToLevelField, RiskScoreFields } from '../../../../../../common/search_strategy';
import type { RiskScoreKpiRequestOptions } from '../../../../../../common/api/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildKpiRiskScoreQuery = ({
  defaultIndex,
  filterQuery,
  entity,
  entities,
  timerange,
}: RiskScoreKpiRequestOptions) => {
  const filter = [...createQueryFilterClauses(filterQuery)];

  if (timerange) {
    filter.push({
      range: {
        '@timestamp': {
          gte: timerange.from,
          lte: timerange.to,
          format: 'strict_date_optional_time',
        },
      },
    });
  }

  const providedEntities = (
    entities && entities.length > 0 ? entities : entity ? [entity] : []
  ).filter((entityType): entityType is EntityType => entityType != null);

  const supportedEntities = providedEntities.filter(
    (entityType) => EntityTypeToLevelField[entityType] !== RiskScoreFields.unsupported
  );

  const aggregatedEntities = supportedEntities.length > 0 ? supportedEntities : providedEntities;

  const baseQuery: ISearchRequestParams = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
    track_total_hits: false,
    query: {
      bool: {
        filter,
      },
    },
    size: 0,
  };

  if (aggregatedEntities.length === 0) {
    return baseQuery;
  }

  const buildAggregationForEntity = (entityType: EntityType): AggregationsAggregationContainer => ({
    terms: {
      field: EntityTypeToLevelField[entityType],
    },
    aggs: {
      unique_entries: {
        cardinality: {
          field: EntityTypeToIdentifierField[entityType],
        },
      },
    },
  });

  if (aggregatedEntities.length === 1) {
    const resolvedEntity = aggregatedEntities[0] ?? entity;
    if (!resolvedEntity) {
      return baseQuery;
    }

    return {
      ...baseQuery,
      aggs: {
        risk: buildAggregationForEntity(resolvedEntity),
      },
    };
  }

  const combinedAggs = aggregatedEntities.reduce<Record<string, AggregationsAggregationContainer>>(
    (acc, currentEntity) => {
      acc[currentEntity] = buildAggregationForEntity(currentEntity);
      return acc;
    },
    {}
  );

  return {
    ...baseQuery,
    aggs: combinedAggs,
  };
};
