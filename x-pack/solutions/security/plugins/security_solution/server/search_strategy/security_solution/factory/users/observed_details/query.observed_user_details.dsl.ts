/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchRequestParams } from '@kbn/search-types';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { isEmpty } from 'lodash';
import type { ObservedUserDetailsRequestOptions } from '../../../../../../common/api/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { buildFieldsTermAggregation } from '../../hosts/details/helpers';
import { USER_FIELDS } from './helpers';

const EUID_RUNTIME_FIELD = 'entity_id';

export const buildObservedUserDetailsQuery = ({
  defaultIndex,
  userName,
  timerange: { from, to },
  filterQuery,
  entityStoreV2,
}: ObservedUserDetailsRequestOptions): ISearchRequestParams => {
  // When no filter query is defined, we default to using the user name
  const userNameFilter = isEmpty(filterQuery) ? { term: { 'user.name': userName } } : undefined;

  const filter: QueryDslQueryContainer[] = [
    ...(entityStoreV2 ? [euid.dsl.getEuidDocumentsContainsIdFilter('user')] : []),
    ...(userNameFilter ? [userNameFilter] : []),
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
    ...(entityStoreV2
      ? { runtime_mappings: { [EUID_RUNTIME_FIELD]: euid.painless.getEuidRuntimeMapping('user') } }
      : {}),
    aggregations: {
      ...buildFieldsTermAggregation(USER_FIELDS),
    },
    query: { bool: { filter } },
    size: 0,
  };

  return dslQuery;
};
