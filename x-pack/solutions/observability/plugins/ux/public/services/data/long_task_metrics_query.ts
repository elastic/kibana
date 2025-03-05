/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METRIC_TRANSACTION_EXPERIENCE_LONGTASK_COUNT,
  METRIC_TRANSACTION_EXPERIENCE_LONGTASK_MAX,
  METRIC_TRANSACTION_EXPERIENCE_LONGTASK_SUM,
} from '@kbn/observability-ui-semantic-conventions';
import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import { PERCENTILE_DEFAULT } from './core_web_vitals_query';
import { getRumPageLoadTransactionsProjection } from './projections';

export function longTaskMetricsQuery(
  start: number,
  end: number,
  percentile: number = PERCENTILE_DEFAULT,
  urlQuery?: string,
  uiFilters?: UxUIFilters
) {
  const setup: SetupUX = { uiFilters: uiFilters ? uiFilters : {} };
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  const params = mergeProjection(projection, {
    size: 0,
    aggs: {
      longTaskSum: {
        percentiles: {
          field: METRIC_TRANSACTION_EXPERIENCE_LONGTASK_SUM,
          percents: [percentile],
          hdr: {
            number_of_significant_value_digits: 3,
          },
        },
      },
      longTaskCount: {
        percentiles: {
          field: METRIC_TRANSACTION_EXPERIENCE_LONGTASK_COUNT,
          percents: [percentile],
          hdr: {
            number_of_significant_value_digits: 3,
          },
        },
      },
      longTaskMax: {
        percentiles: {
          field: METRIC_TRANSACTION_EXPERIENCE_LONGTASK_MAX,
          percents: [percentile],
          hdr: {
            number_of_significant_value_digits: 3,
          },
        },
      },
    },
  });

  return params;
}
