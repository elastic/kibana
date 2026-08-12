/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import { SERVICE_ENVIRONMENT } from '../../../common/elasticsearch_fieldnames';
import { OTEL_SERVICE_ENVIRONMENT } from '../../../common/otel_rum';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';
import { rumPageLoadFilter, rumServiceNameFilter } from './rum_otel_filters';

export function transformEnvironmentsResponse<T>(
  response?: ESSearchResponse<T, ReturnType<typeof getEnvironments>>
) {
  if (!response) return response;

  const aggs = response.aggregations;
  const environmentsBuckets = [
    ...(aggs?.environments.buckets || []),
    ...(aggs?.otelEnvironments?.buckets || []),
  ];

  const environments = Array.from(
    new Set(environmentsBuckets.map((environmentBucket) => environmentBucket.key as string))
  );

  return environments as Environment[];
}

export function getEnvironments({
  serviceName,
  size,
  start,
  end,
}: {
  serviceName?: string;
  size: number;
  start: number;
  end: number;
}) {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: start,
                lte: end,
                format: 'epoch_millis',
              },
            },
          },
          rumPageLoadFilter(),
          ...(serviceName === undefined || serviceName === null
            ? []
            : [rumServiceNameFilter(serviceName)]),
        ],
      },
    },
    aggs: {
      environments: {
        terms: {
          field: SERVICE_ENVIRONMENT,
          missing: ENVIRONMENT_NOT_DEFINED.value,
          size,
        },
      },
      otelEnvironments: {
        terms: {
          field: OTEL_SERVICE_ENVIRONMENT,
          missing: ENVIRONMENT_NOT_DEFINED.value,
          size,
        },
      },
    },
  };
}
