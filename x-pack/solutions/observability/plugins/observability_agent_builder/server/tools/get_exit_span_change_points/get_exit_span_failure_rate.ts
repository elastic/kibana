/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termQuery } from '@kbn/observability-utils-server/es/queries/term_query';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
} from '@kbn/apm-types/es_fields';
import { fetchSeries } from './fetch_timeseries';

export enum EventOutcome {
  success = 'success',
  failure = 'failure',
  unknown = 'unknown',
}

export async function getExitSpanFailureRate({
  apmEventClient,
  start,
  end,
  intervalString,
  filter,
  spanDestinationServiceResource,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  intervalString: string;
  bucketSize: number;
  filter: QueryDslQueryContainer[];
  spanDestinationServiceResource?: string;
}) {
  return (
    await fetchSeries({
      apmEventClient,
      start,
      end,
      operationName: 'assistant_get_exit_span_failure_rate',
      unit: '%',
      documentType: ApmDocumentType.ServiceDestinationMetric,
      rollupInterval: RollupInterval.OneMinute,
      intervalString,
      filter: filter.concat(
        ...termQuery(SPAN_DESTINATION_SERVICE_RESOURCE, spanDestinationServiceResource)
      ),
      groupByFields: [SPAN_DESTINATION_SERVICE_RESOURCE],
      aggs: {
        successful: {
          filter: {
            terms: {
              [EVENT_OUTCOME]: [EventOutcome.success],
            },
          },
          aggs: {
            count: {
              sum: {
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
              },
            },
          },
        },
        successful_or_failed: {
          filter: {
            terms: {
              [EVENT_OUTCOME]: [EventOutcome.success, EventOutcome.failure],
            },
          },
          aggs: {
            count: {
              sum: {
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
              },
            },
          },
        },
        value: {
          bucket_script: {
            buckets_path: {
              successful_or_failed: `successful_or_failed>count`,
              successful: `successful>count`,
            },
            script: '100 * (1 - (params.successful / params.successful_or_failed))',
          },
        },
      },
    })
  ).map((fetchedSerie) => {
    return {
      ...fetchedSerie,
      data: fetchedSerie.data.map((bucket) => {
        return {
          x: bucket.key,
          y: bucket.value?.value as number | null,
        };
      }),
    };
  });
}
