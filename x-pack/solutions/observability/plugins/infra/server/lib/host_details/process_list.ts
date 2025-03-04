/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_EVENT_DATASET,
  ATTR_PROCESS_COMMAND_LINE,
  ATTR_PROCESS_PID,
  ATTR_SYSTEM_PROCESS_STATE,
  ATTR_TIMESTAMP,
  ATTR_USER_NAME,
  METRIC_SYSTEM_PROCESS_CPU_START_TIME,
  METRIC_SYSTEM_PROCESS_CPU_TOTAL_PCT,
  METRIC_SYSTEM_PROCESS_MEMORY_RSS_PCT,
} from '@kbn/observability-ui-semantic-conventions';

import type {
  ProcessListAPIRequest,
  ProcessListAPIQueryAggregation,
} from '../../../common/http_api';
import type { ESSearchClient } from '../metrics/types';
import type { InfraSourceConfiguration } from '../sources';

const TOP_N = 10;

export const getProcessList = async (
  search: ESSearchClient,
  sourceConfiguration: InfraSourceConfiguration,
  { hostTerm, to, sortBy, searchFilter }: ProcessListAPIRequest
) => {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [ATTR_TIMESTAMP]: {
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
            [ATTR_EVENT_DATASET]: 'system.process.summary',
          },
        },
        aggs: {
          summary: {
            top_hits: {
              size: 1,
              sort: [
                {
                  [ATTR_TIMESTAMP]: {
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
            must: searchFilter ?? [{ match_all: {} }],
          },
        },
        aggs: {
          filteredProcs: {
            terms: {
              field: ATTR_PROCESS_COMMAND_LINE,
              size: TOP_N,
              order: {
                [sortBy.name]: sortBy.isAscending ? 'asc' : 'desc',
              },
            },
            aggs: {
              cpu: {
                avg: {
                  field: METRIC_SYSTEM_PROCESS_CPU_TOTAL_PCT,
                },
              },
              memory: {
                avg: {
                  field: METRIC_SYSTEM_PROCESS_MEMORY_RSS_PCT,
                },
              },
              startTime: {
                max: {
                  field: METRIC_SYSTEM_PROCESS_CPU_START_TIME,
                },
              },
              meta: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      [ATTR_TIMESTAMP]: {
                        order: 'desc',
                      },
                    },
                  ],
                  _source: [
                    ATTR_SYSTEM_PROCESS_STATE,
                    ATTR_USER_NAME,
                    ATTR_PROCESS_PID,
                    ATTR_PROCESS_COMMAND_LINE,
                  ],
                },
              },
            },
          },
        },
      },
    },
  };
  try {
    const result = await search<{}, ProcessListAPIQueryAggregation>({
      body,
      index: sourceConfiguration.metricAlias,
    });
    const { buckets: processListBuckets } = result.aggregations!.processes.filteredProcs;
    const processList = processListBuckets.map((bucket) => {
      const meta = bucket.meta.hits.hits[0]._source;

      return {
        cpu: bucket.cpu.value,
        memory: bucket.memory.value,
        startTime: Date.parse(bucket.startTime.value_as_string),
        pid: meta.process.pid,
        state: meta.system.process.state,
        user: meta.user.name,
        command: bucket.key,
      };
    });

    let summary: { [p: string]: number } = {};
    if (result.aggregations!.summaryEvent.summary.hits.hits.length) {
      summary =
        result.aggregations!.summaryEvent.summary.hits.hits[0]._source.system.process.summary;
    }

    return {
      processList,
      summary,
    };
  } catch (e) {
    throw e;
  }
};
