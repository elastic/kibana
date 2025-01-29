/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ManagedUserDatasetKey } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import type { ManagedUserDetailsRequestOptions } from '../../../../../../common/api/search_strategy';
import { EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy';

export const buildManagedUserDetailsQuery = ({
  userEmail,
  userName,
  defaultIndex,
}: ManagedUserDetailsRequestOptions): ISearchRequestParams => {
  const should: QueryDslQueryContainer[] = [{ term: { 'user.name': userName } }];

  if (userEmail) {
    const emailQuery = { terms: { 'user.email': userEmail } };
    should.push(emailQuery);
  }

  const filter = [
    {
      terms: { 'event.dataset': [ManagedUserDatasetKey.OKTA, ManagedUserDatasetKey.ENTRA] },
    },
    EVENT_KIND_ASSET_FILTER,
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      query: { bool: { filter, should, minimum_should_match: 1 } },
      size: 0,
      aggs: {
        datasets: {
          terms: {
            field: 'event.dataset',
          },
          aggs: {
            latest_hit: {
              top_hits: {
                fields: ['*', '_index', '_id'], // '_index' and '_id' are not returned by default
                _source: false,
                size: 1,
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc' as const,
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    sort: [{ '@timestamp': 'desc' }],
  };

  return dslQuery;
};
