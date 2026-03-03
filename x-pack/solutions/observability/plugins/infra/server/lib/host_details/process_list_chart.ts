/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DataSchemaFormatEnum,
  HOST_METRICS_RECEIVER_OTEL,
} from '@kbn/metrics-data-access-plugin/common';
import { EVENT_DATASET } from '@kbn/metrics-data-access-plugin/common/constants';
import { TIMESTAMP_FIELD, PROCESS_COMMANDLINE_FIELD } from '../../../common/constants';
import type {
  ProcessListAPIChartRequest,
  ProcessListAPIRow,
  ProcessListAPIChartResponse,
} from '../../../common/http_api';
import type { InfraMetricsClient } from '../helpers/get_infra_metrics_client';

const TS_COLUMNS: Array<{ name: string; type: 'string' | 'number' | 'date' }> = [
  {
    name: 'timestamp',
    type: 'date',
  },
  {
    name: 'metric_0',
    type: 'number',
  },
];

const getEcsProcessListChart = async (
  infraMetricsClient: InfraMetricsClient,
  { hostTerm, to, command }: Omit<ProcessListAPIChartRequest, 'schema'>
) => {
  const from = to - 60 * 15 * 1000; // 15 minutes

  const response = await infraMetricsClient.search({
    track_total_hits: false,
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
  });

  const { buckets } = response.aggregations!.process.filteredProc;
  const initialResponse: ProcessListAPIChartResponse = {
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
  };

  const timeseries =
    buckets.length > 0
      ? buckets[0].timeseries.buckets.reduce((tsResult, tsBucket) => {
          tsResult.cpu.rows.push({
            metric_0: tsBucket.cpu.value,
            timestamp: tsBucket.key,
          });
          tsResult.memory.rows.push({
            metric_0: tsBucket.memory.value !== null ? tsBucket.memory.value / 100 : null, // convert to ratio (0-1)
            timestamp: tsBucket.key,
          });
          return tsResult;
        }, initialResponse)
      : initialResponse;

  return timeseries;
};

const getSemConvProcessListChart = async (
  infraMetricsClient: InfraMetricsClient,
  { hostTerm, to, command }: Omit<ProcessListAPIChartRequest, 'schema'>
) => {
  const from = to - 60 * 15 * 1000; // 15 minutes

  const response = await infraMetricsClient.search({
    track_total_hits: false,
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
          {
            term: {
              [EVENT_DATASET]: HOST_METRICS_RECEIVER_OTEL,
            },
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
                },
              },
            },
          },
        },
      },
    },
  });

  const { buckets } = response.aggregations!.process.filteredProc;
  const initialResponse: ProcessListAPIChartResponse = {
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
  };

  const timeseries =
    buckets.length > 0
      ? buckets[0].timeseries.buckets.reduce((tsResult, tsBucket) => {
          tsResult.cpu.rows.push({
            metric_0: tsBucket.cpu_total.value,
            timestamp: tsBucket.key,
          });
          tsResult.memory.rows.push({
            metric_0: tsBucket.memory.value !== null ? tsBucket.memory.value / 100 : null, // convert to ratio (0-1)
            timestamp: tsBucket.key,
          });
          return tsResult;
        }, initialResponse)
      : initialResponse;
  return timeseries;
};

export const getProcessListChart = async (
  infraMetricsClient: InfraMetricsClient,
  { hostTerm, indexPattern, to, command, schema }: ProcessListAPIChartRequest
) => {
  const detectedSchema = schema || DataSchemaFormatEnum.ECS;

  if (detectedSchema === DataSchemaFormatEnum.SEMCONV) {
    return await getSemConvProcessListChart(infraMetricsClient, {
      hostTerm,
      indexPattern,
      to,
      command,
    });
  } else {
    return await getEcsProcessListChart(infraMetricsClient, {
      hostTerm,
      indexPattern,
      to,
      command,
    });
  }
};
