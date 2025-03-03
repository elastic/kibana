/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_TRANSACTION_DURATION_US,
  ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
  ATTR_TRANSACTION_MARKS_NAVIGATION_TIMING_FETCH_START,
} from '@kbn/observability-ui-semantic-conventions';
import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
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
    size: 0,
    track_total_hits: true,
    aggs: {
      hasFetchStartField: {
        filter: {
          exists: { field: ATTR_TRANSACTION_MARKS_NAVIGATION_TIMING_FETCH_START },
        },
        aggs: {
          totalPageLoadDuration: {
            percentiles: {
              field: ATTR_TRANSACTION_DURATION_US,
              percents: [percentile],
              hdr: {
                number_of_significant_value_digits: 3,
              },
            },
          },
          backEnd: {
            percentiles: {
              field: ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
              percents: [percentile],
              hdr: {
                number_of_significant_value_digits: 3,
              },
            },
          },
        },
      },
    },
  });

  return params;
}
