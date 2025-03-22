/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import {
  ATTR_PROCESSOR_EVENT,
  ATTR_SERVICE_ENVIRONMENT,
  ATTR_SERVICE_NAME,
  ATTR_TIMESTAMP,
  ATTR_TRANSACTION_TYPE,
  PROCESSOR_EVENT_VALUE_TRANSACTION,
  TRANSACTION_TYPE_VALUE_PAGE_LOAD,
} from '@kbn/observability-ui-semantic-conventions';
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
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [ATTR_TIMESTAMP]: {
                gte: start,
                lte: end,
                format: 'epoch_millis',
              },
            },
          },
          {
            term: {
              [ATTR_TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE_PAGE_LOAD,
            },
          },
          {
            term: {
              [ATTR_PROCESSOR_EVENT]: PROCESSOR_EVENT_VALUE_TRANSACTION,
            },
          },
          ...(serviceName === undefined || serviceName === null
            ? []
            : [{ term: { [ATTR_SERVICE_NAME]: serviceName } }]),
        ],
      },
    },
    aggs: {
      environments: {
        terms: {
          field: ATTR_SERVICE_ENVIRONMENT,
          missing: ENVIRONMENT_NOT_DEFINED.value,
          size,
        },
      },
    },
  };
}
