/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_TRANSACTION_DURATION_US,
  ATTR_TRANSACTION_URL,
} from '@kbn/observability-ui-semantic-conventions';
import { SetupUX } from '../../../typings/ui_filters';
import { getRumPageLoadTransactionsProjection } from './projections';
import { callDateMath } from './call_date_math';
import { mergeProjection } from '../../../common/utils/merge_projection';

export function urlSearchQuery(restFilters: any, uxQuery: any, searchValue: string) {
  const setup: SetupUX = { uiFilters: restFilters ? restFilters : {} };
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery: searchValue,
    ...uxQuery,
    start: callDateMath(uxQuery?.start),
    end: callDateMath(uxQuery?.end),
  });
  const params = mergeProjection(projection, {
    size: 0,
    aggs: {
      totalUrls: {
        cardinality: {
          field: ATTR_TRANSACTION_URL,
        },
      },
      urls: {
        terms: {
          field: ATTR_TRANSACTION_URL,
          size: 10,
        },
        aggs: {
          medianPLD: {
            percentiles: {
              field: ATTR_TRANSACTION_DURATION_US,
              percents: [Number(uxQuery?.percentile)],
            },
          },
        },
      },
    },
  });
  return params;
}
