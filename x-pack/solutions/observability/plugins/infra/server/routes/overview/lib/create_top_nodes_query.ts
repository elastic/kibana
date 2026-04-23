/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { MetricsSourceConfiguration } from '../../../../common/metrics_sources';
import type { TopNodesRequest } from '../../../../common/http_api/overview_api';
import { DEFAULT_SCHEMA, TIMESTAMP_FIELD } from '../../../../common/constants';

const getNodeFilter = (schema: DataSchemaFormat) => {
  const inventoryModel = findInventoryModel('host');
  const filters = inventoryModel.nodeFilter?.({ schema }) ?? [];
  return filters[0] ?? { match_all: {} };
};

const getEcsAggs = (options: TopNodesRequest) => ({
  uptime: {
    max: {
      field: 'system.uptime.duration.ms',
    },
  },
  cpu: {
    avg: {
      field: 'system.cpu.total.norm.pct',
    },
  },
  iowait: {
    avg: {
      field: 'system.core.iowait.pct',
    },
  },
  load: {
    avg: {
      field: 'system.load.15',
    },
  },
  rx: {
    filter: {
      exists: {
        field: 'host.network.ingress.bytes',
      },
    },
    aggs: {
      bytes: {
        avg: {
          field: 'rx_bytes_per_period',
        },
      },
    },
  },
  tx: {
    filter: {
      exists: {
        field: 'host.network.egress.bytes',
      },
    },
    aggs: {
      bytes: {
        avg: {
          field: 'tx_bytes_per_period',
        },
      },
    },
  },
  timeseries: {
    date_histogram: {
      field: '@timestamp',
      fixed_interval: options.bucketSize,
      extended_bounds: {
        min: options.timerange.from,
        max: options.timerange.to,
      },
    },
    aggs: {
      cpu: {
        avg: {
          field: 'host.cpu.pct',
        },
      },
      iowait: {
        avg: {
          field: 'system.core.iowait.pct',
        },
      },
      load: {
        avg: {
          field: 'system.load.15',
        },
      },
      rx: {
        filter: {
          exists: {
            field: 'host.network.ingress.bytes',
          },
        },
        aggs: {
          bytes: {
            avg: {
              field: 'rx_bytes_per_period',
            },
          },
        },
      },
      tx: {
        filter: {
          exists: {
            field: 'host.network.egress.bytes',
          },
        },
        aggs: {
          bytes: {
            avg: {
              field: 'tx_bytes_per_period',
            },
          },
        },
      },
    },
  },
});

const getSemconvAggs = (options: TopNodesRequest) => ({
  cpu_idle: {
    terms: {
      field: 'state',
      include: ['idle'],
    },
    aggs: {
      avg: {
        avg: {
          field: 'system.cpu.utilization',
        },
      },
    },
  },
  cpu_idle_total: {
    sum_bucket: {
      buckets_path: 'cpu_idle.avg',
    },
  },
  cpu: {
    bucket_script: {
      buckets_path: {
        cpuIdleTotal: 'cpu_idle_total',
      },
      script: '1 - params.cpuIdleTotal',
      gap_policy: 'skip',
    },
  },
  load: {
    avg: {
      field: 'system.cpu.load_average.15m',
    },
  },
  timeseries: {
    date_histogram: {
      field: '@timestamp',
      fixed_interval: options.bucketSize,
      extended_bounds: {
        min: options.timerange.from,
        max: options.timerange.to,
      },
    },
    aggs: {
      cpu_idle: {
        terms: {
          field: 'state',
          include: ['idle'],
        },
        aggs: {
          avg: {
            avg: {
              field: 'system.cpu.utilization',
            },
          },
        },
      },
      cpu_idle_total: {
        sum_bucket: {
          buckets_path: 'cpu_idle.avg',
        },
      },
      cpu: {
        bucket_script: {
          buckets_path: {
            cpuIdleTotal: 'cpu_idle_total',
          },
          script: '1 - params.cpuIdleTotal',
          gap_policy: 'skip',
        },
      },
      load: {
        avg: {
          field: 'system.cpu.load_average.15m',
        },
      },
    },
  },
});

export const createTopNodesQuery = (
  options: TopNodesRequest,
  source: MetricsSourceConfiguration,
  schema: DataSchemaFormat = DEFAULT_SCHEMA
) => {
  const isEcs = schema === 'ecs';

  const nestedSearchFields: { [key: string]: string } = {
    rx: 'rx>bytes',
    tx: 'tx>bytes',
  };
  const SEMCONV_UNSUPPORTED_SORTS = new Set(['uptime', 'iowait', 'rx', 'tx']);
  const sortByHost = options.sort && options.sort === 'name';

  const defaultSortField = isEcs ? 'uptime' : 'load';
  const effectiveSort =
    !isEcs && options.sort && SEMCONV_UNSUPPORTED_SORTS.has(options.sort)
      ? undefined
      : options.sort;
  const metricsSortField = effectiveSort
    ? nestedSearchFields[effectiveSort] || effectiveSort
    : defaultSortField;
  const sortField = sortByHost ? '_key' : metricsSortField;
  const sortDirection = options.sortDirection ?? 'asc';

  return {
    ...(isEcs
      ? {
          runtime_mappings: {
            rx_bytes_per_period: {
              type: 'double',
              script: {
                source: `
          if(doc['host.network.ingress.bytes'].size() !=0)
          {
            emit((doc['host.network.ingress.bytes'].value/(doc['metricset.period'].value / 1000)));
          }
            `,
              },
            },
            tx_bytes_per_period: {
              type: 'double',
              script: {
                source: `
            if(doc['host.network.egress.bytes'].size() !=0)
          {
            emit((doc['host.network.egress.bytes'].value/(doc['metricset.period'].value / 1000)));
          }
            `,
              },
            },
          },
        }
      : {}),
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [TIMESTAMP_FIELD]: {
                gte: options.timerange.from,
                lte: options.timerange.to,
                format: 'epoch_millis',
              },
            },
          },
          getNodeFilter(schema),
        ],
      },
    },
    aggs: {
      nodes: {
        terms: {
          field: 'host.name',
          size: options.size,
          order: { [sortField]: sortDirection },
        },
        aggs: {
          metadata: {
            top_metrics: {
              metrics: [
                { field: 'host.os.platform' },
                { field: 'host.name' },
                { field: 'cloud.provider' },
              ],
              sort: { [TIMESTAMP_FIELD]: 'desc' },
              size: 1,
            },
          },
          ...(isEcs ? getEcsAggs(options) : getSemconvAggs(options)),
        },
      },
    },
  };
};
