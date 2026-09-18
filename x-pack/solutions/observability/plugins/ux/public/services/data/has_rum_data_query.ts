/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchResponse } from '@kbn/es-types';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import moment from 'moment';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { TRANSACTION_PAGE_LOAD } from '../../../common/transaction_types';
import { rangeQuery } from './range_query';

export const HAS_RUM_DATA_TIERS: DataTier[] = ['data_hot', 'data_warm'];

/** Window for the cheap existence pass, day-rounded so the request body stays cacheable. */
export const HAS_RUM_DATA_LOOKBACK = 'now-30d/d';

interface HasRumDataQueryOptions {
  dataTiers?: DataTier[];
  since?: estypes.DateMath;
}

/**
 * Formats a response to `hasRumDataWithServiceNameQuery`; `serviceName` is optional because the
 * `mostTraffic` buckets are empty when the requested range holds no matching documents.
 */
export function formatHasRumResult<T>(
  esResult: ESSearchResponse<
    T,
    ReturnType<typeof hasRumDataWithServiceNameQuery>,
    { restTotalHitsAsInt: false }
  >,
  indices?: string
) {
  if (!esResult) return esResult;
  return {
    indices,
    hasData: esResult.hits.total.value > 0,
    serviceName: esResult.aggregations?.services?.mostTraffic?.buckets?.[0]?.key,
  };
}

function hasRumDataBaseQuery({ dataTiers, since }: HasRumDataQueryOptions = {}) {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
          { term: { [PROCESSOR_EVENT]: 'transaction' } },
          ...(dataTiers?.length ? [{ terms: { _tier: dataTiers } }] : []),
          // Open ended, so documents timestamped ahead of the cluster clock still match.
          ...(since ? [{ range: { '@timestamp': { gte: since } } }] : []),
        ],
      },
    },
  };
}

export function hasRumDataQuery({ dataTiers, since }: HasRumDataQueryOptions = {}) {
  return {
    ...hasRumDataBaseQuery({ dataTiers, since }),
    terminate_after: 1,
    track_total_hits: 1,
  };
}

export function hasRumDataWithServiceNameQuery({
  start = moment().subtract(24, 'h').valueOf(),
  end = moment().valueOf(),
  dataTiers,
}: {
  start?: number;
  end?: number;
  dataTiers?: DataTier[];
} = {}) {
  return {
    ...hasRumDataBaseQuery({ dataTiers }),
    aggs: {
      services: {
        filter: rangeQuery(start, end)[0],
        aggs: {
          mostTraffic: {
            terms: {
              field: SERVICE_NAME,
              size: 1,
            },
          },
        },
      },
    },
  };
}
