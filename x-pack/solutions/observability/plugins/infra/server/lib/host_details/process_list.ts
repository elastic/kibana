/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSchemaFormatEnum } from '@kbn/metrics-data-access-plugin/common';
import {
  TIMESTAMP_FIELD,
  PROCESS_COMMANDLINE_FIELD,
  MANDATORY_PROCESS_FIELDS_ECS,
  MANDATORY_PROCESS_FIELDS_SEMCONV,
  TOP_N,
} from '../../../common/constants';
import type { ProcessListAPIRequest } from '../../../common/http_api';
import type { InfraMetricsClient } from '../helpers/get_infra_metrics_client';

interface EcsMetaSource {
  process: { pid: number };
  system: {
    process: {
      state: string;
      summary: { [key: string]: number };
    };
  };
  user: { name: string };
}

const getEcsProcessList = async (
  infraMetricsClient: InfraMetricsClient,
  { hostTerm, to, sortBy, searchFilter }: Omit<ProcessListAPIRequest, 'schema'>
) => {
  const mandatoryFieldsFilter = MANDATORY_PROCESS_FIELDS_ECS.map((field) => ({
    exists: {
      field,
    },
  }));

  const filter = searchFilter ? searchFilter : [{ match_all: {} }];
  const response = await infraMetricsClient.search({
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [TIMESTAMP_FIELD]: {
                gte: to - 60 * 1000, // 1 minute
                lte: to,
                format: 'epoch_millis',
              },
            },
          },
          {
            term: hostTerm,
          },
        ],
      },
    },
    aggs: {
      summaryEvent: {
        filter: {
          term: {
            'event.dataset': 'system.process.summary',
          },
        },
        aggs: {
          summary: {
            top_hits: {
              size: 1,
              sort: [
                {
                  [TIMESTAMP_FIELD]: {
                    order: 'desc',
                  },
                },
              ],
              _source: ['system.process.summary'],
            },
          },
        },
      },
      processes: {
        filter: {
          bool: {
            must: [...filter, ...mandatoryFieldsFilter],
          },
        },
        aggs: {
          filteredProcs: {
            terms: {
              field: PROCESS_COMMANDLINE_FIELD,
              size: TOP_N,
              order: {
                [sortBy.name]: sortBy.isAscending ? 'asc' : 'desc',
              },
            },
            aggs: {
              cpu: {
                avg: {
                  field: 'system.process.cpu.total.pct',
                },
              },
              memory: {
                avg: {
                  field: 'system.process.memory.rss.pct',
                },
              },
              startTime: {
                max: {
                  field: 'system.process.cpu.start_time',
                },
              },
              meta: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      [TIMESTAMP_FIELD]: {
                        order: 'desc',
                      },
                    },
                  ],
                  _source: [
                    'system.process.state',
                    'user.name',
                    'process.pid',
                    'process.command_line',
                  ],
                },
              },
            },
          },
        },
      },
    },
  });

  const { buckets: processListBuckets } = response.aggregations!.processes.filteredProcs;
  const processList = processListBuckets.map((bucket) => {
    const meta = bucket.meta.hits.hits[0]._source as EcsMetaSource;

    return {
      cpu: bucket.cpu.value ?? null,
      memory: bucket.memory.value ?? null,
      startTime: bucket.startTime.value,
      pid: meta.process.pid,
      state: meta.system.process.state,
      user: meta.user.name,
      command: bucket.key as string,
    };
  });

  const summary: { [p: string]: number } = response.aggregations?.summaryEvent.summary.hits.hits
    ?.length
    ? (response.aggregations?.summaryEvent.summary.hits.hits[0]._source as EcsMetaSource).system
        .process.summary
    : {};

  return {
    processList,
    summary,
  };
};

const getSemConvProcessList = async (
  infraMetricsClient: InfraMetricsClient,
  { hostTerm, to, sortBy, searchFilter }: Omit<ProcessListAPIRequest, 'schema'>
) => {
  const mandatoryFieldsFilter = MANDATORY_PROCESS_FIELDS_SEMCONV.map((field) => ({
    exists: {
      field,
    },
  }));

  const filter = searchFilter ? searchFilter : [{ match_all: {} }];
  const response = await infraMetricsClient.search({
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [TIMESTAMP_FIELD]: {
                gte: to - 60 * 1000, // 1 minute
                lte: to,
                format: 'epoch_millis',
              },
            },
          },
          {
            term: hostTerm,
          },
        ],
      },
    },
    aggs: {
      processes: {
        filter: {
          bool: {
            must: [...filter, ...mandatoryFieldsFilter],
          },
        },
        aggs: {
          filteredProcs: {
            terms: {
              field: PROCESS_COMMANDLINE_FIELD,
              size: TOP_N,
              order: {
                [sortBy.name]: sortBy.isAscending ? 'asc' : 'desc',
              },
            },
            aggs: {
              // Dual CPU aggregation approach to handle sorting vs display accuracy

              // PROBLEM: Pipeline aggregations (like sum_bucket) cannot be used for sorting in ES
              // SOLUTION: Use two separate CPU aggregations:

              // 1. 'cpu' - Simple average for sorting
              //    Used in the 'order' clause above for sorting buckets

              // 2. 'cpu_total' - Complex state-based aggregation for accurate display values
              //    Aggregates CPU utilization across all process states, then sums them up
              //    More accurate but cannot be used for sorting (pipeline aggregation)

              // This ensures sorting works correctly while maintaining accurate CPU calculations
              // the difference between simple average and state-aggregated CPU is likely minimal
              cpu: {
                avg: {
                  field: 'process.cpu.utilization',
                },
              },
              cpu_by_state: {
                terms: {
                  field: 'attributes.state',
                  size: 20,
                },
                aggs: {
                  avg_cpu: {
                    avg: {
                      field: 'process.cpu.utilization',
                    },
                  },
                },
              },
              cpu_total: {
                sum_bucket: {
                  buckets_path: 'cpu_by_state>avg_cpu',
                },
              },
              memory: {
                avg: {
                  field: 'process.memory.utilization',
                },
              },
              startTime: {
                max: {
                  field: 'start_timestamp',
                },
              },
              meta: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      [TIMESTAMP_FIELD]: {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: ['process.pid', 'process.command_line', 'process.owner'],
                },
              },
            },
          },
        },
      },
    },
  });

  const processList =
    response.aggregations?.processes.filteredProcs.buckets.map((bucket) => {
      const meta = bucket.meta.hits.hits[0].fields as {
        'process.pid': number[];
        'process.owner': string[];
      };

      return {
        cpu: bucket.cpu_total.value,
        memory: bucket.memory.value !== null ? bucket.memory.value / 100 : null,
        startTime: bucket.startTime.value,
        pid: meta['process.pid'][0],
        state: '', // Not available in SEMCONV
        user: meta['process.owner'][0],
        command: bucket.key as string,
      };
    }) || [];

  return {
    processList,
    summary: {},
  };
};

export const getProcessList = async (
  infraMetricsClient: InfraMetricsClient,
  { hostTerm, to, sortBy, searchFilter, schema, sourceId }: ProcessListAPIRequest
) => {
  const detectedSchema = schema || DataSchemaFormatEnum.ECS;

  if (detectedSchema === DataSchemaFormatEnum.SEMCONV) {
    return await getSemConvProcessList(infraMetricsClient, {
      hostTerm,
      to,
      sortBy,
      searchFilter,
      sourceId,
    });
  } else {
    return await getEcsProcessList(infraMetricsClient, {
      hostTerm,
      to,
      sortBy,
      searchFilter,
      sourceId,
    });
  }
};
