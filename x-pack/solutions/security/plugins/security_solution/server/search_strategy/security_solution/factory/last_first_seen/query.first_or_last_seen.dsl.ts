/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common';
import type { FirstLastSeenRequestOptions } from '../../../../../common/api/search_strategy';

import { createQueryFilterClauses } from '../../../../utils/build_query';

export const buildFirstOrLastSeenQuery = (options: FirstLastSeenRequestOptions) => {
  const { field, value, defaultIndex, order, filterQuery, hostEntityIdentifiers } = options;

  const entityFilters =
    hostEntityIdentifiers && Object.keys(hostEntityIdentifiers).length > 0
      ? euid.getEuidDslFilterBasedOnDocument('host', hostEntityIdentifiers)
      : { term: { [field]: value } };

  const filter = [
    ...createQueryFilterClauses(filterQuery),
    ...(entityFilters ? [entityFilters] : []),
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
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
  };

  return dslQuery;
};
