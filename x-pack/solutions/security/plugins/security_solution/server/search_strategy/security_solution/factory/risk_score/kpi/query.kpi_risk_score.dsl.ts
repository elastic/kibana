/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  const baseQuery = {
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

  if (aggregatedEntities.length <= 1) {
    const resolvedEntity = aggregatedEntities[0] ?? entity;
    if (!resolvedEntity) {
      return baseQuery;
    }

    return {
      ...baseQuery,
      aggs: {
        risk: {
          terms: {
            field: EntityTypeToLevelField[resolvedEntity],
          },
          aggs: {
            unique_entries: {
              cardinality: {
                field: EntityTypeToIdentifierField[resolvedEntity],
              },
            },
          },
        },
      },
    };
  }

  const combinedAggs = aggregatedEntities.reduce<Record<string, unknown>>((acc, currentEntity) => {
    acc[currentEntity] = {
      terms: {
        field: EntityTypeToLevelField[currentEntity],
      },
      aggs: {
        unique_entries: {
          cardinality: {
            field: EntityTypeToIdentifierField[currentEntity],
          },
        },
      },
    };
    return acc;
  }, {});

  return {
    ...baseQuery,
    aggs: combinedAggs,
  };
};
