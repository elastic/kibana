/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isEmpty } from 'lodash';
import type { ISearchRequestParams } from '@kbn/search-types';
import type { ObservedServiceDetailsRequestOptions } from '../../../../../../common/api/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { buildFieldsTermAggregation } from '../../hosts/details/helpers';
import { SERVICE_FIELDS } from './helpers';

export const buildObservedServiceDetailsQuery = ({
  serviceName,
  defaultIndex,
  timerange: { from, to },
  filterQuery,
}: ObservedServiceDetailsRequestOptions): ISearchRequestParams => {
  // An entity-store identity filter replaces the default `service.name` term so resolution-group
  // aliases with a different service name are still matched.
  const serviceNameFilter: QueryDslQueryContainer[] = isEmpty(filterQuery)
    ? [{ term: { 'service.name': serviceName } }]
    : [];
  const filter: QueryDslQueryContainer[] = [
    ...createQueryFilterClauses(filterQuery),
    ...serviceNameFilter,
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

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    aggregations: {
      ...buildFieldsTermAggregation(SERVICE_FIELDS),
    },
    query: { bool: { filter } },
    size: 0,
  };

  return dslQuery;
};
