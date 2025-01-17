/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import { TRANSACTION_PAGE_LOAD } from '../../../common/transaction_types';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { Environment } from '../../../common/environment_rt';

export function transformEnvironmentsResponse<T>(
  response?: ESSearchResponse<T, ReturnType<typeof getEnvironments>>
) {
  if (!response) return response;

  const aggs = response.aggregations;
  const environmentsBuckets = aggs?.environments.buckets || [];

  const environments = environmentsBuckets.map(
    (environmentBucket) => environmentBucket.key as string
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
    body: {
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
            {
              term: {
                [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD,
              },
            },
            {
              term: {
                [PROCESSOR_EVENT]: 'transaction',
              },
            },
            ...(serviceName === undefined || serviceName === null
              ? []
              : [{ term: { [SERVICE_NAME]: serviceName } }]),
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
      },
    },
  };
}
