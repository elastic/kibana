/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchClient } from '@kbn/metrics-data-access-plugin/server';
import { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import {
  TIMESTAMP_FIELD,
  PROCESS_COMMANDLINE_FIELD,
  MANDATORY_PROCESS_FIELDS_ECS,
  MANDATORY_PROCESS_FIELDS_SEMCONV,
  TOP_N,
} from '../../../common/constants';
import type {
  ProcessListAPIRequest,
  ProcessListAPIQueryAggregation,
  ProcessListAPIQueryAggregationSEMCONV,
} from '../../../common/http_api';
import type { InfraSourceConfiguration } from '../sources';

const getProcessListECS = async (
  search: ESSearchClient,
  sourceConfiguration: InfraSourceConfiguration,
  { hostTerm, to, sortBy, searchFilter }: Omit<ProcessListAPIRequest, 'schema'>
) => {
  const mandatoryFieldsFilter = MANDATORY_PROCESS_FIELDS_ECS.map((field) => ({
    exists: {
      field,
    },
  }));

  const filter = searchFilter ? searchFilter : [{ match_all: {} }];
  const body = {
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
  };

  const result = await search<{}, ProcessListAPIQueryAggregation>({
    body,
    index: sourceConfiguration.metricAlias,
  });

  const { buckets: processListBuckets } = result.aggregations!.processes.filteredProcs;
  const processList = processListBuckets.map((bucket) => {
    const meta = bucket.meta.hits.hits[0]._source;

    return {
      cpu: bucket.cpu.value ?? null,
      memory: bucket.memory.value ?? null,
      startTime: Date.parse(bucket.startTime.value_as_string),
      pid: meta.process.pid,
      state: meta.system.process.state,
      user: meta.user.name,
      command: bucket.key,
    };
  });

  const summary: { [p: string]: number } = result.aggregations!.summaryEvent.summary.hits.hits
    .length
    ? result.aggregations!.summaryEvent.summary.hits.hits[0]._source.system.process.summary
    : {};

  return {
    processList,
    summary,
  };
};

const getProcessListSEMCONV = async (
  search: ESSearchClient,
  sourceConfiguration: InfraSourceConfiguration,
  { hostTerm, to, sortBy, searchFilter }: Omit<ProcessListAPIRequest, 'schema'>
) => {
  const mandatoryFieldsFilter = MANDATORY_PROCESS_FIELDS_SEMCONV.map((field) => ({
    exists: {
      field,
    },
  }));

  const filter = searchFilter ? searchFilter : [{ match_all: {} }];
  const body = {
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
          bool: {
            must: [
              {
                term: {
                  'event.dataset': 'hostmetricsreceiver.otel',
                },
              },
              {
                exists: {
                  field: 'system.processes.count',
                },
              },
            ],
          },
        },
        aggs: {
          by_status: {
            terms: {
              field: 'attributes.status',
              size: 20,
            },
            aggs: {
              latest_count: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      [TIMESTAMP_FIELD]: {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: ['system.processes.count'],
                },
              },
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
                  field: 'process.cpu.time',
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
  };

  const result = await search<{}, ProcessListAPIQueryAggregationSEMCONV>({
    body,
    index: sourceConfiguration.metricAlias,
  });

  const { buckets: processListBuckets } = result.aggregations!.processes.filteredProcs;
  const processList = processListBuckets.map((bucket) => {
    const hit = bucket.meta.hits.hits[0];
    const meta = hit.fields || {};

    const getValue = (fieldName: string) => {
      const value = meta[fieldName];
      return Array.isArray(value) ? value[0] : value;
    };

    const metricTimestamp = hit.fields?.['@timestamp']
      ? new Date(getValue('@timestamp')).getTime()
      : Date.now();

    // Get start time from aggregation or fallback to current time
    const startTime = bucket.startTime?.value_as_string
      ? Date.parse(bucket.startTime.value_as_string)
      : metricTimestamp;

    const processRuntimeMs = metricTimestamp - startTime;

    const cpuTimeValueMs = bucket.cpu.value * 1000; // convert seconds to milliseconds
    const cpu = processRuntimeMs > 0 ? cpuTimeValueMs / processRuntimeMs : 0;

    return {
      cpu,
      memory: bucket.memory.value / 100, // convert to ratio (0-1)
      startTime,
      pid: meta['process.pid'][0] as number,
      state: '', // Not available in SEMCONV
      user: meta['process.owner'][0] as string,
      command: bucket.key,
    };
  });

  const summary: { [p: string]: number } = {};

  if (result.aggregations?.summaryEvent?.by_status?.buckets?.length) {
    const statusBuckets = result.aggregations.summaryEvent.by_status.buckets;

    const getValue = (fields: Record<string, unknown>, fieldName: string) => {
      const value = fields[fieldName];
      return Array.isArray(value) ? value[0] : value;
    };

    const { total, ...statusCounts } = statusBuckets.reduce(
      (acc, bucket) => {
        const status = bucket.key;
        const latestHit = bucket.latest_count?.hits?.hits?.[0];

        if (latestHit?.fields) {
          const count = Number(getValue(latestHit.fields, 'system.processes.count')) || 0;
          acc.total += count;

          // Map SEMCONV status values to UI field names
          switch (status) {
            case 'running':
              acc.running = count;
              break;
            case 'sleeping':
              acc.sleeping = count;
              break;
            case 'stopped':
              acc.stopped = count;
              break;
            case 'idle':
              acc.idle = count;
              break;
            case 'zombies': // SEMCONV uses "zombies", UI expects "zombie"
              acc.zombie = count;
              break;
            default: // blocked, daemon, detached, locked, orphan, paging, system, unknown
              acc.unknown = (acc.unknown || 0) + count;
              break;
          }
        }

        return acc;
      },
      { total: 0 } as { total: number; [key: string]: number }
    );

    Object.assign(summary, { total, ...statusCounts });
  }

  return {
    processList,
    summary,
  };
};

export const getProcessList = async (
  search: ESSearchClient,
  sourceConfiguration: InfraSourceConfiguration,
  { hostTerm, to, sortBy, searchFilter, schema, sourceId }: ProcessListAPIRequest
) => {
  try {
    const detectedSchema = schema || DataSchemaFormat.ECS;

    if (detectedSchema === DataSchemaFormat.SEMCONV) {
      return await getProcessListSEMCONV(search, sourceConfiguration, {
        hostTerm,
        to,
        sortBy,
        searchFilter,
        sourceId,
      });
    } else {
      return await getProcessListECS(search, sourceConfiguration, {
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
