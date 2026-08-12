/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeProjection } from '../../../common/utils/merge_projection';
import type { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import {
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';
import { OTEL_EXCEPTION_MESSAGE, OTEL_EXCEPTION_TYPE } from '../../../common/otel_rum';
import { getRumErrorsProjection } from './projections';

export function jsErrorsQuery(
  start: number,
  end: number,
  pageSize: number,
  pageIndex: number,
  urlQuery?: string,
  uiFilters?: UxUIFilters
) {
  const setup: SetupUX = { uiFilters: uiFilters ? uiFilters : {} };
  const projection = getRumErrorsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  const params = mergeProjection(projection, {
    size: 0,
    track_total_hits: true,
    aggs: {
      totalErrorGroups: {
        cardinality: {
          // Classic grouping_key; OTel falls back via multi-field script would be better,
          // but cardinality on classic field still works when classic errors exist.
          field: ERROR_GROUP_ID,
        },
      },
      totalErrorPages: {
        cardinality: {
          field: TRANSACTION_ID,
        },
      },
      errors: {
        terms: {
          field: ERROR_GROUP_ID,
          size: 500,
        },
        aggs: {
          bucket_truncate: {
            bucket_sort: {
              size: pageSize,
              from: pageIndex * pageSize,
            },
          },
          impactedPages: {
            filter: {
              bool: {
                should: [
                  { term: { 'transaction.type': 'page-load' } },
                  { term: { event_name: 'exception' } },
                ],
                minimum_should_match: 1,
              },
            },
            aggs: {
              pageCount: {
                cardinality: {
                  field: TRANSACTION_ID,
                },
              },
            },
          },
          sample: {
            top_hits: {
              _source: [
                ERROR_EXC_MESSAGE,
                ERROR_EXC_TYPE,
                ERROR_GROUP_ID,
                OTEL_EXCEPTION_MESSAGE,
                OTEL_EXCEPTION_TYPE,
                '@timestamp',
              ],
              sort: [{ '@timestamp': 'desc' as const }],
              size: 1,
            },
          },
        },
      },
      // OTel exceptions group by exception.type when no error.grouping_key
      otelErrors: {
        terms: {
          field: OTEL_EXCEPTION_TYPE,
          size: 500,
        },
        aggs: {
          bucket_truncate: {
            bucket_sort: {
              size: pageSize,
              from: pageIndex * pageSize,
            },
          },
          sample: {
            top_hits: {
              _source: [OTEL_EXCEPTION_MESSAGE, OTEL_EXCEPTION_TYPE, '@timestamp'],
              sort: [{ '@timestamp': 'desc' as const }],
              size: 1,
            },
          },
        },
      },
    },
  });

  return params;
}
