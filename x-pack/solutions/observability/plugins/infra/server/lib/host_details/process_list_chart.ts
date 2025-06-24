/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'lodash';
import { TIMESTAMP_FIELD, PROCESS_COMMANDLINE_FIELD } from '../../../common/constants';
import type {
  ProcessListAPIChartRequest,
  ProcessListAPIChartQueryAggregation,
  ProcessListAPIRow,
  ProcessListAPIChartResponse,
} from '../../../common/http_api';
import type { ESSearchClient } from '../metrics/types';

export const getProcessListChart = async (
  search: ESSearchClient,
  { hostTerm, indexPattern, to, command }: ProcessListAPIChartRequest
) => {
  const from = to - 60 * 15 * 1000; // 15 minutes

  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [TIMESTAMP_FIELD]: {
                gte: from,
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
      process: {
        filter: {
          bool: {
            must: [
              {
                match: {
                  [PROCESS_COMMANDLINE_FIELD]: command,
                },
              },
            ],
          },
        },
        aggs: {
          filteredProc: {
            terms: {
              field: PROCESS_COMMANDLINE_FIELD,
              size: 1,
            },
            aggs: {
              timeseries: {
                date_histogram: {
                  field: TIMESTAMP_FIELD,
                  fixed_interval: '1m',
                  extended_bounds: {
                    min: from,
                    max: to,
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
                },
              },
            },
          },
        },
      },
    },
  };
  try {
    const result = await search<{}, ProcessListAPIChartQueryAggregation>({
      body,
      index: indexPattern,
    });
    const { buckets } = result.aggregations!.process.filteredProc;
    const timeseries = first(
      buckets.map((bucket) =>
        bucket.timeseries.buckets.reduce(
          (tsResult, tsBucket) => {
            tsResult.cpu.rows.push({
              metric_0: tsBucket.cpu.value,
              timestamp: tsBucket.key,
            });
            tsResult.memory.rows.push({
              metric_0: tsBucket.memory.value,
              timestamp: tsBucket.key,
            });
            return tsResult;
          },
          {
            cpu: {
              id: 'cpu',
              columns: TS_COLUMNS,
              rows: [] as ProcessListAPIRow[],
            },
            memory: {
              id: 'memory',
              columns: TS_COLUMNS,
              rows: [] as ProcessListAPIRow[],
            },
          }
        )
      )
    );
    return timeseries as ProcessListAPIChartResponse;
  } catch (e) {
    throw e;
  }
};

const TS_COLUMNS = [
  {
    name: 'timestamp',
    type: 'date',
  },
  {
    name: 'metric_0',
    type: 'number',
  },
];
