/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityRequestOptions } from '../../../../../common/api/search_strategy/asset_criticality/all';
import { createQueryFilterClauses } from '../../../../utils/build_query';

export const buildAssetCriticalityQuery = ({
  timerange,
  filterQuery,
  defaultIndex,
  pagination: { querySize, cursorStart } = {
    querySize: QUERY_SIZE,
    cursorStart: 0,
  },
}: AssetCriticalityRequestOptions) => {
  const filter = createQueryFilterClauses(filterQuery);

  if (timerange) {
    filter.push({
      range: {
        '@timestamp': {
          gte: timerange.from,
          lte: timerange.to,
          format: 'strict_date_optional_time',
        },
      },
    });
  }

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
    track_total_hits: true,
    size: querySize,
    from: cursorStart,
    body: {
      query: { bool: { filter } },
    },
  };

  return dslQuery;
};

export const QUERY_SIZE = 10;
