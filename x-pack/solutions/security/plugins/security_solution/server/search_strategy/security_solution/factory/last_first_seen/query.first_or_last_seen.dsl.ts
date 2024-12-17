/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FirstLastSeenRequestOptions } from '../../../../../common/api/search_strategy';

import { createQueryFilterClauses } from '../../../../utils/build_query';

export const buildFirstOrLastSeenQuery = (options: FirstLastSeenRequestOptions) => {
  const { field, value, defaultIndex, order, filterQuery } = options;

  const filter = [...createQueryFilterClauses(filterQuery), { term: { [field]: value } }];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      query: { bool: { filter } },
      _source: false,
      fields: [
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
      size: 1,
      sort: [
        {
          '@timestamp': {
            order,
          },
        },
      ],
    },
  };

  return dslQuery;
};
