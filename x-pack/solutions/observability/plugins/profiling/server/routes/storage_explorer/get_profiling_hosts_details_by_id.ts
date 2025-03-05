/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery } from '@kbn/observability-plugin/server';
import {
  ATTR_HOST_ID,
  ATTR_PROFILING_AGENT_CONFIG_PROBABILISTIC_THRESHOLD,
  ATTR_PROFILING_AGENT_START_TIME,
  ATTR_PROFILING_HOST_NAME,
  ATTR_PROFILING_PROJECT_ID,
  ATTR_TIMESTAMP,
} from '@kbn/observability-ui-semantic-conventions';
import { keyBy } from 'lodash';
import type { ProfilingESClient } from '../../utils/create_profiling_es_client';

interface HostDetails {
  hostId: string;
  hostName: string;
  probabilisticValuesPerProject: Record<
    string,
    { projectId: string; probabilisticValues: Array<{ value: number; date: number | null }> }
  >;
}

export async function getProfilingHostsDetailsById({
  client,
  timeFrom,
  timeTo,
  kuery,
  hostIds,
}: {
  client: ProfilingESClient;
  timeFrom: number;
  timeTo: number;
  kuery: string;
  hostIds: string[];
}): Promise<Record<string, HostDetails>> {
  const resp = await client.search('get_host_ids_names', {
    index: 'profiling-hosts',
    size: 0,
    query: {
      bool: {
        filter: [
          { terms: { [ATTR_HOST_ID]: hostIds } },
          {
            range: {
              [ATTR_TIMESTAMP]: {
                gte: String(timeFrom),
                lt: String(timeTo),
                format: 'epoch_second',
              },
            },
          },
          ...kqlQuery(kuery),
        ],
      },
    },
    aggs: {
      hostIds: {
        terms: {
          field: ATTR_HOST_ID,
        },
        aggs: {
          hostNames: {
            top_metrics: {
              metrics: { field: ATTR_PROFILING_HOST_NAME },
              sort: '_score',
            },
          },
          projectIds: {
            terms: {
              field: ATTR_PROFILING_PROJECT_ID,
            },
            aggs: {
              probabilisticValues: {
                terms: {
                  field: ATTR_PROFILING_AGENT_CONFIG_PROBABILISTIC_THRESHOLD,
                  size: 5,
                  order: { agentFirstStartDate: 'desc' },
                },
                aggs: {
                  agentFirstStartDate: {
                    min: {
                      field: ATTR_PROFILING_AGENT_START_TIME,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const hostsDetails =
    resp.aggregations?.hostIds.buckets.map((bucket): HostDetails => {
      const hostId = bucket.key as string;
      const hostName = bucket.hostNames.top[0].metrics[ATTR_PROFILING_HOST_NAME] as string;

      const probabilisticValuesPerProject = bucket.projectIds.buckets.map((projectIdBucket) => {
        const projectId = projectIdBucket.key as string;
        const probabilisticValues = projectIdBucket.probabilisticValues.buckets.map(
          (probValuesBucket) => {
            return {
              value: probValuesBucket.key as number,
              date: probValuesBucket.agentFirstStartDate.value,
            };
          }
        );
        return { projectId, probabilisticValues };
      });

      return {
        hostId,
        hostName,
        probabilisticValuesPerProject: keyBy(probabilisticValuesPerProject, 'projectId'),
      };
    }) || [];

  return keyBy(hostsDetails, 'hostId');
}
