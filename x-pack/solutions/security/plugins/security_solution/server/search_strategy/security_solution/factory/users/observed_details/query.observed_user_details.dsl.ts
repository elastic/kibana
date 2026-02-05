/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common';
import type { ISearchRequestParams } from '@kbn/search-types';
import type { ObservedUserDetailsRequestOptions } from '../../../../../../common/api/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { buildFieldsTermAggregation } from '../../hosts/details/helpers';
import { USER_FIELDS } from './helpers';

/**
 * Converts flat dotted keys (e.g. user.name, user.entity.id) to nested structure
 * expected by getEuidDslFilterBasedOnDocument.
 */
const flatEntityIdentifiersToNestedDoc = (
  flat: Record<string, string>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      const next = (current as Record<string, unknown>)[p];
      if (next === undefined || typeof next !== 'object') {
        (current as Record<string, unknown>)[p] = {};
      }
      current = (current as Record<string, unknown>)[p] as Record<string, unknown>;
    }
    (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
  }
  return result;
};

export const buildObservedUserDetailsQuery = ({
  entityIdentifiers,
  defaultIndex,
  timerange: { from, to },
  filterQuery,
}: ObservedUserDetailsRequestOptions): ISearchRequestParams => {
  const nestedDoc = flatEntityIdentifiersToNestedDoc(entityIdentifiers);
  const entityFilters = euid.getEuidDslFilterBasedOnDocument('user', nestedDoc);
  const filter: QueryDslQueryContainer[] = [
    ...createQueryFilterClauses(filterQuery),
    ...(entityFilters ? [entityFilters] : []),
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
      ...buildFieldsTermAggregation(USER_FIELDS),
    },
    query: { bool: { filter } },
    size: 0,
  };

  return dslQuery;
};
