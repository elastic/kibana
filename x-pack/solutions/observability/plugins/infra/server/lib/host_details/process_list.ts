/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchClient } from '@kbn/metrics-data-access-plugin/server';
import { DataSchemaFormatEnum, HOST_METRICS_RECEIVER_OTEL } from '@kbn/metrics-data-access-plugin/common';
import {
  TIMESTAMP_FIELD,
  PROCESS_COMMANDLINE_FIELD,
  MANDATORY_PROCESS_FIELDS_ECS,
  MANDATORY_PROCESS_FIELDS_SEMCONV,
  TOP_N,
} from '../../../common/constants';
import type {
  ProcessListAPIRequest,
} from '../../../common/http_api';
import { InfraMetricsClient } from '../helpers/get_infra_metrics_client';

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
    const meta = bucket.meta.hits.hits[0]._source;

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

  const summary: { [p: string]: number } = response.aggregations!.summaryEvent.summary.hits.hits
    ? response.aggregations!.summaryEvent.summary.hits.hits[0]._source.system.process.summary
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
              cpu: {
                avg: {
                  field: 'process.cpu.utilization',
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

  const { buckets: processListBuckets } = response.aggregations!.processes.filteredProcs;
  const processList = processListBuckets.map((bucket) => {
    const hit = bucket.meta.hits.hits[0];
    const meta = hit.fields || {};

    return {
      cpu: bucket.cpu.value,
      memory: bucket.memory.value !== null ? bucket.memory.value / 100 : null,
      startTime: bucket.startTime.value,
      pid: meta['process.pid'][0] as number,
      state: '', // Not available in SEMCONV
      user: meta['process.owner'][0] as string,
      command: bucket.key as string,
    };
  });

  return {
    processList,
    summary: {},
  };
};

export const getProcessList = async (
  infraMetricsClient: InfraMetricsClient,
  { hostTerm, to, sortBy, searchFilter, schema, sourceId }: ProcessListAPIRequest
) => {
  try {
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
  } catch (e) {
    throw e;
  }
};
