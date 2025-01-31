/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ISearchRequestParams } from '@kbn/search-types';
import type { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ENTITY_FLYOUT } from '../../../../../../common/constants';
import type { ObservedUserDetailsRequestOptions } from '../../../../../../common/api/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { buildFieldsTermAggregation } from '../../hosts/details/helpers';
import { USER_FIELDS } from './helpers';

export const buildObservedUserDetailsQuery = async (
  {
    userName,
    defaultIndex,
    timerange: { from, to },
    filterQuery,
  }: ObservedUserDetailsRequestOptions,
  deps?: SearchStrategyDependencies
): Promise<ISearchRequestParams> => {
  const isColdFrozenTierDisabled = await deps?.uiSettingsClient.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ENTITY_FLYOUT
  );

  const filter: QueryDslQueryContainer[] = [
    ...createQueryFilterClauses(filterQuery),
    { term: { 'user.name': userName } },
    {
      range: {
        '@timestamp': {
          format: 'strict_date_optional_time',
          gte: from,
          lte: to,
        },
      },
    },
  ];

  if (isColdFrozenTierDisabled) {
    filter.push({
      bool: {
        must_not: {
          terms: {
            _tier: ['data_frozen', 'data_cold'],
          },
        },
      },
    });
  }

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      aggregations: {
        ...buildFieldsTermAggregation(USER_FIELDS),
      },
      query: { bool: { filter } },
      size: 0,
    },
  };

  return dslQuery;
};
