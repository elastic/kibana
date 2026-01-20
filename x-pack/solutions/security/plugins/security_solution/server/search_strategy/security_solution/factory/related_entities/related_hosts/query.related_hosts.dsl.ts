/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import type { RelatedHostsRequestOptions } from '../../../../../../common/api/search_strategy';
import { buildEntityFiltersFromEntityIdentifiers } from '../../../../../../common/search_strategy/security_solution/risk_score/common';

export const buildRelatedHostsQuery = ({
  entityIdentifiers,
  defaultIndex,
  from,
}: RelatedHostsRequestOptions): ISearchRequestParams => {
  const now = new Date();
  const entityFilters = buildEntityFiltersFromEntityIdentifiers(entityIdentifiers);
  const filter = [
    ...entityFilters,
    { term: { 'event.category': 'authentication' } },
    { term: { 'event.outcome': 'success' } },
    {
      range: {
        '@timestamp': {
          gt: from,
          lte: now.toISOString(),
          format: 'strict_date_optional_time',
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
      host_count: { cardinality: { field: 'host.name' } },
      host_data: {
        terms: {
          field: 'host.name',
          size: 1000,
        },
        aggs: {
          ip: {
            terms: {
              field: 'host.ip',
              size: 10,
            },
          },
        },
      },
    },
    query: { bool: { filter } },
    size: 0,
  };

  return dslQuery;
};
