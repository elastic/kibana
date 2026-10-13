/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchRequestParams } from '@kbn/search-types';
import { isEmpty } from 'lodash';
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
  // When no filter query is defined, we default to using the service name (mirrors host details).
  // Callers scope to several services (e.g. a resolution group) by passing their own filter query.
  const serviceNameFilter = isEmpty(filterQuery)
    ? { term: { 'service.name': serviceName } }
    : undefined;

  const filter: QueryDslQueryContainer[] = [
    ...(serviceNameFilter ? [serviceNameFilter] : []),
    ...createQueryFilterClauses(filterQuery),
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
