/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchRequest } from '@kbn/es-types';
import { mergeProjection } from '../../../common/utils/merge_projection';
import type { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import { OTEL_LONGTASK, OTEL_LONGTASK_DURATION, OTEL_SPAN_NAME } from '../../../common/otel_rum';
import { PERCENTILE_DEFAULT } from './core_web_vitals_query';
import { getRumPageLoadTransactionsProjection } from './projections';
import { rangeQuery } from './range_query';
import { getEsFilter } from './get_es_filter';

const LONG_TASK_SUM_FIELD = 'transaction.experience.longtask.sum';
const LONG_TASK_COUNT_FIELD = 'transaction.experience.longtask.count';
const LONG_TASK_MAX_FIELD = 'transaction.experience.longtask.max';

export function longTaskMetricsQuery(
  start: number,
  end: number,
  percentile: number = PERCENTILE_DEFAULT,
  urlQuery?: string,
  uiFilters?: UxUIFilters
): Omit<ESSearchRequest, 'index'> {
  const setup: SetupUX = { uiFilters: uiFilters ? uiFilters : {} };
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  const otelLongtaskFilter = {
    bool: {
      filter: [
        ...rangeQuery(start, end),
        { term: { [OTEL_SPAN_NAME]: OTEL_LONGTASK } },
        ...getEsFilter(uiFilters ?? {}),
      ],
    },
  };

  const params: ESSearchRequest = mergeProjection(projection, {
    size: 0,
    query: {
      bool: {
        should: [{ bool: { filter: [...projection.query.bool.filter] } }, otelLongtaskFilter],
        minimum_should_match: 1,
        must_not: [...projection.query.bool.must_not],
      },
    },
    aggs: {
      longTaskSum: {
        percentiles: {
          field: LONG_TASK_SUM_FIELD,
          percents: [percentile],
          hdr: {
            number_of_significant_value_digits: 3,
          },
        },
      },
      longTaskCount: {
        percentiles: {
          field: LONG_TASK_COUNT_FIELD,
          percents: [percentile],
          hdr: {
            number_of_significant_value_digits: 3,
          },
        },
      },
      longTaskMax: {
        percentiles: {
          field: LONG_TASK_MAX_FIELD,
          percents: [percentile],
          hdr: {
            number_of_significant_value_digits: 3,
          },
        },
      },
      otelLongTaskDuration: {
        percentiles: {
          field: OTEL_LONGTASK_DURATION,
          percents: [percentile],
          hdr: {
            number_of_significant_value_digits: 3,
          },
        },
      },
      otelLongTaskCount: {
        filter: { term: { [OTEL_SPAN_NAME]: OTEL_LONGTASK } },
      },
    },
  });

  return params;
}
