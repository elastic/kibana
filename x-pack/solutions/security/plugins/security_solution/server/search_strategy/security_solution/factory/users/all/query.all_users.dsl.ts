/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import type { UsersRequestOptions } from '../../../../../../common/api/search_strategy';
import type { Direction } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { UsersFields } from '../../../../../../common/search_strategy/security_solution/users/common';
import { assertUnreachable } from '../../../../../../common/utility_types';

export const buildUsersQuery = ({
  defaultIndex,
  filterQuery,
  pagination,
  sort,
  timerange: { from, to },
}: UsersRequestOptions): ISearchRequestParams => {
  // TODO: replace magic number with defaults
  const { querySize } = pagination || { activePage: 0, querySize: 10 };

  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
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
    body: {
      aggregations: {
        user_count: { cardinality: { field: 'user.name' } },
        user_data: {
          terms: { size: querySize, field: 'user.name', order: getQueryOrder(sort) },
          aggs: {
            lastSeen: { max: { field: '@timestamp' } },
            domain: {
              top_hits: {
                size: 1,
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc' as const,
                    },
                  },
                ],
                _source: false,
              },
            },
          },
        },
      },
      query: { bool: { filter } },
      _source: false,
      fields: [
        'user.name',
        'user.domain',
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

type QueryOrder = { lastSeen: Direction } | { domain: Direction } | { _key: Direction };

const getQueryOrder = (sort: UsersRequestOptions['sort']): QueryOrder => {
  if (!sort) return assertUnreachable(sort);

  if (sort.field === UsersFields.lastSeen) {
    return { lastSeen: sort.direction };
  } else if (sort.field === UsersFields.name) {
    return { _key: sort.direction };
  } else {
    throw new Error(`Invalid sort field provided for Users query: "${sort.field}"`);
  }
};
