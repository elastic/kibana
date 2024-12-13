/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSACTION_DURATION, TRANSACTION_URL } from '../../../common/elasticsearch_fieldnames';
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
    body: {
      size: 0,
      aggs: {
        totalUrls: {
          cardinality: {
            field: TRANSACTION_URL,
          },
        },
        urls: {
          terms: {
            field: TRANSACTION_URL,
            size: 10,
          },
          aggs: {
            medianPLD: {
              percentiles: {
                field: TRANSACTION_DURATION,
                percents: [Number(uxQuery?.percentile)],
              },
            },
          },
        },
      },
    },
  });
  return params;
}
