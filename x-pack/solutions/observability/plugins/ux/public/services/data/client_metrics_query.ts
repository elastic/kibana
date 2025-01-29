/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import {
  TRANSACTION_TIME_TO_FIRST_BYTE,
  TRANSACTION_DURATION,
} from '../../../common/elasticsearch_fieldnames';
import { getRumPageLoadTransactionsProjection } from './projections';

export function clientMetricsQuery(
  start: number,
  end: number,
  percentile: number = 50,
  urlQuery?: string,
  uiFilters?: UxUIFilters
) {
  const setup: SetupUX = { uiFilters: uiFilters ? uiFilters : {} };
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    checkFetchStartFieldExists: false,
    start,
    end,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      track_total_hits: true,
      aggs: {
        hasFetchStartField: {
          filter: {
            exists: { field: 'transaction.marks.navigationTiming.fetchStart' },
          },
          aggs: {
            totalPageLoadDuration: {
              percentiles: {
                field: TRANSACTION_DURATION,
                percents: [percentile],
                hdr: {
                  number_of_significant_value_digits: 3,
                },
              },
            },
            backEnd: {
              percentiles: {
                field: TRANSACTION_TIME_TO_FIRST_BYTE,
                percents: [percentile],
                hdr: {
                  number_of_significant_value_digits: 3,
                },
              },
            },
          },
        },
      },
    },
  });

  return params;
}
