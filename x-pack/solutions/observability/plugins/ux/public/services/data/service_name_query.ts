/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchRequest } from '@kbn/es-types';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import {
  OTEL_ATTR_RUM_PLATFORM,
  OTEL_OS_NAME,
  OTEL_OS_TYPE,
  OTEL_RUM_PLATFORM,
  OTEL_SERVICE_NAME,
} from '../../../common/otel_rum';
import { RUM_CANONICAL_SESSION_ID_FIELD } from '../../../common/rum_sessions';
import {
  preferRumAppPlatform,
  resolveRumAppPlatform,
  type RumApplicationOption,
} from '../../../common/rum_platform';
import type { UxUIFilters } from '../../../typings/ui_filters';
import { getEsFilter } from './get_es_filter';
import { rangeQuery } from './range_query';
import { rumPageLoadFilter } from './rum_otel_filters';

const platformSubAggs = {
  rumPlatform: { terms: { field: OTEL_RUM_PLATFORM, size: 5 } },
  attrPlatform: { terms: { field: OTEL_ATTR_RUM_PLATFORM, size: 5 } },
  osType: { terms: { field: OTEL_OS_TYPE, size: 5 } },
  osName: { terms: { field: OTEL_OS_NAME, size: 5 } },
};

interface PlatformTerms {
  buckets?: Array<{ key: string }>;
}

export interface ServiceNameBucket {
  key: string;
  rumPlatform?: PlatformTerms;
  attrPlatform?: PlatformTerms;
  osType?: PlatformTerms;
  osName?: PlatformTerms;
}

export interface ServiceNameAggregations {
  services?: { buckets?: ServiceNameBucket[] };
  otelServices?: { buckets?: ServiceNameBucket[] };
}

const keysOf = (terms?: PlatformTerms): string[] =>
  terms?.buckets?.map((bucket) => bucket.key) ?? [];

const platformFromBucket = (bucket: ServiceNameBucket) =>
  resolveRumAppPlatform([
    ...keysOf(bucket.rumPlatform),
    ...keysOf(bucket.attrPlatform),
    ...keysOf(bucket.osType),
    ...keysOf(bucket.osName),
  ]);

export const parseServiceNameApps = (
  aggregations?: ServiceNameAggregations
): RumApplicationOption[] => {
  const byName = new Map<string, RumApplicationOption['platform']>();
  for (const bucket of [
    ...(aggregations?.services?.buckets ?? []),
    ...(aggregations?.otelServices?.buckets ?? []),
  ]) {
    byName.set(
      bucket.key,
      preferRumAppPlatform(byName.get(bucket.key), platformFromBucket(bucket))
    );
  }
  return [...byName.entries()].map(([name, platform]) => ({ name, platform }));
};

export function serviceNameQuery(
  start: number,
  end: number,
  uiFilters?: UxUIFilters
): Omit<ESSearchRequest, 'index'> {
  const filters = uiFilters ?? {};
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          {
            bool: {
              should: [rumPageLoadFilter(), { exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } }],
              minimum_should_match: 1,
            },
          },
          ...getEsFilter(filters),
        ],
        must_not: [...getEsFilter(filters, true)],
      },
    },
    aggs: {
      services: {
        terms: {
          field: SERVICE_NAME,
          size: 1000,
        },
        aggs: platformSubAggs,
      },
      otelServices: {
        terms: {
          field: OTEL_SERVICE_NAME,
          size: 1000,
        },
        aggs: platformSubAggs,
      },
    },
  };
}
