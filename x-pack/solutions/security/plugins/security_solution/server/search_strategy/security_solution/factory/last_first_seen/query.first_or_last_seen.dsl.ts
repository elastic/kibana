/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FirstLastSeenRequestOptions } from '../../../../../common/api/search_strategy';
import type { ESQuery } from '../../../../../common/typed_json';
import { buildEntityFiltersFromEntityIdentifiers } from '../../../../../common/search_strategy/security_solution/risk_score/common';

import { createQueryFilterClauses } from '../../../../utils/build_query';

export const buildFirstOrLastSeenQuery = (options: FirstLastSeenRequestOptions) => {
  const { entityIdentifiers, defaultIndex, order, filterQuery } = options;

  const entityFilters = buildEntityFiltersFromEntityIdentifiers(entityIdentifiers) as ESQuery[];
  const filter = [...createQueryFilterClauses(filterQuery), ...entityFilters];

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
