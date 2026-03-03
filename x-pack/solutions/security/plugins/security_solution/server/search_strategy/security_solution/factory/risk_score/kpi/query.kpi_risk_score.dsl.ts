/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { EntityTypeToLevelField } from '../../../../../../common/search_strategy';
import type { RiskScoreKpiRequestOptions } from '../../../../../../common/api/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildKpiRiskScoreQuery = ({
  defaultIndex,
  filterQuery,
  entity,
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

  // Support both single entity and array of entities
  const entities = Array.isArray(entity) ? entity : [entity];

  // Build aggregations for each entity type
  const entityAggregations = entities.reduce((acc, entityType) => {
    acc[entityType] = {
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
    };
    return acc;
  }, {} as Record<string, AggregationsAggregationContainer>);

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
    track_total_hits: false,
    aggs: entityAggregations,
    query: {
      bool: {
        filter,
      },
    },
    size: 0,
  };

  return dslQuery;
};
