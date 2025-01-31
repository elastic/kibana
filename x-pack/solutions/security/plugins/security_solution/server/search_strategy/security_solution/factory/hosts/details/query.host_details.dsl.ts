/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { cloudFieldsMap, hostFieldsMap } from '@kbn/securitysolution-ecs';
import type { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ENTITY_FLYOUT } from '../../../../../../common/constants';
import type { HostDetailsRequestOptions } from '../../../../../../common/search_strategy/security_solution';
import { reduceFields } from '../../../../../utils/build_query/reduce_fields';
import { HOST_DETAILS_FIELDS, buildFieldsTermAggregation } from './helpers';

export const buildHostDetailsQuery = async (
  { hostName, defaultIndex, timerange: { from, to } }: HostDetailsRequestOptions,
  deps?: SearchStrategyDependencies
): Promise<ISearchRequestParams> => {
  const isColdFrozenTierDisabled = await deps?.uiSettingsClient.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ENTITY_FLYOUT
  );

  const esFields = reduceFields(HOST_DETAILS_FIELDS, {
    ...hostFieldsMap,
    ...cloudFieldsMap,
  });

  const filter: QueryDslQueryContainer[] = [
    { term: { 'host.name': hostName } },
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
        ...buildFieldsTermAggregation(esFields.filter((field) => !['@timestamp'].includes(field))),
        endpoint_id: {
          filter: {
            term: {
              'agent.type': 'endpoint',
            },
          },
          aggs: {
            value: {
              terms: {
                field: 'agent.id',
              },
            },
          },
        },
      },
      query: { bool: { filter } },
      _source: false,
      fields: [
        ...esFields,
        'agent.type',
        'agent.id',
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
      size: 0,
    },
  };

  return dslQuery;
};
