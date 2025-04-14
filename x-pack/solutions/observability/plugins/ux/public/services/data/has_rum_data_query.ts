/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import {
  ATTR_PROCESSOR_EVENT,
  ATTR_SERVICE_NAME,
  ATTR_TRANSACTION_TYPE,
  PROCESSOR_EVENT_VALUE_TRANSACTION,
  TRANSACTION_TYPE_VALUE_PAGE_LOAD,
} from '@kbn/observability-ui-semantic-conventions';
import moment from 'moment';
import { rangeQuery } from './range_query';

export function formatHasRumResult<T>(
  esResult: ESSearchResponse<T, ReturnType<typeof hasRumDataQuery>, { restTotalHitsAsInt: false }>,
  indices?: string
) {
  if (!esResult) return esResult;
  return {
    indices,
    hasData: esResult.hits.total.value > 0,
    serviceName: esResult.aggregations?.services?.mostTraffic?.buckets?.[0]?.key,
  };
}

export function hasRumDataQuery({
  start = moment().subtract(24, 'h').valueOf(),
  end = moment().valueOf(),
}: {
  start?: number;
  end?: number;
}) {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [ATTR_TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE_PAGE_LOAD } },
          { term: { [ATTR_PROCESSOR_EVENT]: PROCESSOR_EVENT_VALUE_TRANSACTION } },
        ],
      },
    },
    aggs: {
      services: {
        filter: rangeQuery(start, end)[0],
        aggs: {
          mostTraffic: {
            terms: {
              field: ATTR_SERVICE_NAME,
              size: 1,
            },
          },
        },
      },
    },
  };
}
