/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SeedParams {
  esClient: { bulk: (params: { index: string; body: unknown[] }) => Promise<unknown> };
  scenarioId: string;
  hosts: string[];
  timeRange: { from: string; to: string };
}

/**
 * Seed raw telemetry into logs-* so the corroboration worker has real
 * ES|QL rows to query. Reuses the pattern from kbn-evals-suite-security-deep-watch-forensics.
 */
export const seedForensicTimeline = async (params: SeedParams): Promise<void> => {
  const { esClient, scenarioId, hosts, timeRange } = params;
  const events: unknown[] = [];

  for (const host of hosts) {
    // Process events
    events.push(
      {
        index: {
          _index: 'logs-endpoint.events.process-default',
          _id: `${scenarioId}-proc-${host}`,
        },
      },
      {
        '@timestamp': timeRange.from,
        host: { name: host },
        process: {
          name: 'powershell.exe',
          parent: { name: 'outlook.exe' },
          command_line: 'powershell -enc SQBFAFgA',
          pid: 1234,
        },
        event: { category: 'process', type: ['start'] },
      }
    );

    // Network events
    events.push(
      {
        index: { _index: 'logs-endpoint.events.network-default', _id: `${scenarioId}-net-${host}` },
      },
      {
        '@timestamp': timeRange.from,
        host: { name: host },
        source: { ip: '10.0.0.1' },
        destination: { ip: '192.168.1.50', port: 443 },
        network: { protocol: 'tcp' },
        event: { category: 'network', type: ['connection'] },
      }
    );
  }

  await esClient.bulk({ index: 'logs-*', body: events });
};

export const cleanupSeededData = async (
  esClient: { deleteByQuery: (params: { index: string; body: unknown }) => Promise<unknown> },
  scenarioId: string
): Promise<void> => {
  await esClient.deleteByQuery({
    index: 'logs-*',
    body: {
      query: {
        prefix: { _id: scenarioId },
      },
    },
  });
};
