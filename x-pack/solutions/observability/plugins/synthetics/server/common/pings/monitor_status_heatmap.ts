/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsEsClient } from '../../lib';

export async function queryMonitorHeatmap({
  syntheticsEsClient,
  from,
  to,
  monitorId,
  location,
  intervalInMinutes,
  remoteName,
}: {
  syntheticsEsClient: SyntheticsEsClient;
  from: number | string;
  to: number | string;
  monitorId: string;
  location: string;
  intervalInMinutes: number;
  remoteName?: string;
}) {
  const index = remoteName ? `${remoteName}:${syntheticsEsClient.heartbeatIndices}` : undefined;

  return syntheticsEsClient.search({
    ...(index ? { index } : {}),
    size: 0,
    query: {
      bool: {
        filter: [
          {
            exists: {
              field: 'summary',
            },
          },
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
          // Project monitors on remote clusters can have a different
          // `monitor.id` from the configId we have on hand, so accept either
          // `monitor.id` or `config_id`. This also keeps the local-monitor
          // case unchanged for documents whose `monitor.id == config_id`.
          {
            bool: {
              should: [{ term: { 'monitor.id': monitorId } }, { term: { config_id: monitorId } }],
              minimum_should_match: 1,
            },
          },
          {
            term: {
              'observer.geo.name': location,
            },
          },
        ],
      },
    },
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    _source: false,
    fields: ['@timestamp', 'config_id', 'summary.*', 'error.*', 'observer.geo.name'],
    aggs: {
      heatmap: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: `${intervalInMinutes}m`,
        },
        aggs: {
          up: {
            sum: {
              field: 'summary.up',
            },
          },
          down: {
            sum: {
              field: 'summary.down',
            },
          },
        },
      },
    },
  });
}
