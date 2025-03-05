/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_ERROR_EXCEPTION_MESSAGE,
  ATTR_ERROR_EXCEPTION_TYPE,
  ATTR_ERROR_GROUPING_KEY,
  ATTR_TIMESTAMP,
  ATTR_TRANSACTION_ID,
  ATTR_TRANSACTION_TYPE,
  TRANSACTION_TYPE_VALUE_PAGE_LOAD,
} from '@kbn/observability-ui-semantic-conventions';
import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
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
          field: ATTR_ERROR_GROUPING_KEY,
        },
      },
      totalErrorPages: {
        cardinality: {
          field: ATTR_TRANSACTION_ID,
        },
      },
      errors: {
        terms: {
          field: ATTR_ERROR_GROUPING_KEY,
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
              term: {
                [ATTR_TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE_PAGE_LOAD,
              },
            },
            aggs: {
              pageCount: {
                cardinality: {
                  field: ATTR_TRANSACTION_ID,
                },
              },
            },
          },
          sample: {
            top_hits: {
              _source: [
                ATTR_ERROR_EXCEPTION_MESSAGE,
                ATTR_ERROR_EXCEPTION_TYPE,
                ATTR_ERROR_GROUPING_KEY,
                ATTR_TIMESTAMP,
              ],
              sort: [{ [ATTR_TIMESTAMP]: 'desc' as const }],
              size: 1,
            },
          },
        },
      },
    },
  });

  return params;
}
