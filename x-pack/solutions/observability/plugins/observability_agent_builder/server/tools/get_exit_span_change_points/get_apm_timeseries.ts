/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { kqlQuery } from '@kbn/observability-utils-server/es/queries/kql_query';
import { rangeQuery } from '@kbn/observability-utils-server/es/queries/range_query';
import { termQuery } from '@kbn/observability-utils-server/es/queries/term_query';
import * as t from 'io-ts';
import type { ChangePointType } from '@kbn/es-types/src';
import { SERVICE_NAME } from '@kbn/apm-types/es_fields';
import { getBucketSize } from '@kbn/apm-data-access-plugin/common/utils/get_bucket_size';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { environmentQuery } from '../get_runtime_metrics/environment_query';
import { getExitSpanFailureRate } from './get_exit_span_failure_rate';
import { getExitSpanLatency } from './get_exit_span_latency';
import { getExitSpanThroughput } from './get_exit_span_throughput';

export enum ApmTimeseriesType {
  exitSpanThroughput = 'exit_span_throughput',
  exitSpanLatency = 'exit_span_latency',
  exitSpanFailureRate = 'exit_span_failure_rate',
  errorEventRate = 'error_event_rate',
}

export const getApmTimeseriesRt = t.type({
  stats: t.array(
    t.intersection([
      t.type({
        'service.name': t.string,
        title: t.string,
        timeseries: t.union([
          t.intersection([
            t.type({
              name: t.union([
                t.literal(ApmTimeseriesType.exitSpanThroughput),
                t.literal(ApmTimeseriesType.exitSpanFailureRate),
                t.literal(ApmTimeseriesType.exitSpanLatency),
              ]),
            }),
            t.partial({
              'span.destination.service.resource': t.string,
            }),
          ]),
          t.type({
            name: t.literal(ApmTimeseriesType.errorEventRate),
          }),
        ]),
      }),
      t.partial({
        filter: t.string,
        offset: t.string,
        'service.environment': t.string,
      }),
    ])
  ),
  start: t.string,
  end: t.string,
});

type ApmTimeseriesArgs = t.TypeOf<typeof getApmTimeseriesRt>;

export interface TimeseriesChangePoint {
  change_point?: number | undefined;
  r_value?: number | undefined;
  trend?: string | undefined;
  p_value?: number;
  date: string | undefined;
  type: ChangePointType;
}

export interface ApmTimeseries {
  stat: ApmTimeseriesArgs['stats'][number];
  group: string;
  id: string;
  data: Array<{ x: number; y: number | null }>;
  value: number | null;
  start: number;
  end: number;
  unit: string;
  changes: TimeseriesChangePoint[];
}

export async function getApmTimeseries({
  arguments: args,
  apmEventClient,
}: {
  arguments: t.TypeOf<typeof getApmTimeseriesRt>;
  apmEventClient: APMEventClient;
}): Promise<ApmTimeseries[]> {
  const start = datemath.parse(args.start)!.valueOf();
  const end = datemath.parse(args.end)!.valueOf();

  const { bucketSize, intervalString } = getBucketSize({
    start,
    end,
    numBuckets: 100,
  });

  return (
    await Promise.all(
      args.stats.map(async (stat) => {
        const parameters = {
          apmEventClient,
          start,
          end,
          bucketSize,
          intervalString,
          filter: [
            ...rangeQuery(start, end),
            ...termQuery(SERVICE_NAME, stat['service.name']),
            ...kqlQuery(stat.filter),
            ...environmentQuery(stat['service.environment']),
          ],
        };
        const name = stat.timeseries.name;

        async function fetchSeriesForStat() {
          switch (name) {
            case ApmTimeseriesType.exitSpanThroughput:
              return await getExitSpanThroughput({
                ...parameters,
                spanDestinationServiceResource:
                  stat.timeseries['span.destination.service.resource'],
              });

            case ApmTimeseriesType.exitSpanFailureRate:
              return await getExitSpanFailureRate({
                ...parameters,
                spanDestinationServiceResource:
                  stat.timeseries['span.destination.service.resource'],
              });

            case ApmTimeseriesType.exitSpanLatency:
              return await getExitSpanLatency({
                ...parameters,
                spanDestinationServiceResource:
                  stat.timeseries['span.destination.service.resource'],
              });

            case ApmTimeseriesType.errorEventRate:
              return [];
          }
        }

        const allFetchedSeries = await fetchSeriesForStat();
        return allFetchedSeries.map((series) => ({ ...series, stat }));
      })
    )
  ).flatMap((statResults) =>
    statResults.flatMap((statResult) => {
      const changePointType = Object.keys(
        statResult.change_point?.type ?? {}
      )?.[0] as ChangePointType;

      return {
        stat: statResult.stat,
        group: statResult.stat.title,
        id: statResult.groupBy,
        data: statResult.data,
        value: statResult.value,
        start,
        end,
        unit: statResult.unit,
        changes: [
          ...(changePointType &&
          changePointType !== 'indeterminable' &&
          changePointType !== 'stationary'
            ? [
                {
                  date: statResult.change_point.bucket?.key,
                  type: changePointType,
                  ...statResult.change_point.type[changePointType],
                },
              ]
            : []),
        ],
      };
    })
  );
}
