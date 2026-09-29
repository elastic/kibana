/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';
import type { SeedContext, SeededQuery } from '../types';
import { runDiscovery } from './run_discovery';

jest.mock('../lib/kibana');

const config: ConnectionConfig = {
  esUrl: 'http://elasticsearch.test',
  kibanaUrl: 'http://kibana.test',
  username: 'elastic',
  password: 'changeme',
};
const ctx: SeedContext = {
  ...config,
  streamName: 'logs-synth-default',
  scenarioName: 'fraud_check_redis_herring',
  seed: 42,
  space: 'seed-space',
  generatedAt: '2026-08-27T10:00:00.000Z',
};
const seededQueries: SeededQuery[] = [
  {
    queryId: 'primary-query',
    ruleId: 'primary-rule',
    title: 'Primary incident',
    esql: 'FROM logs-synth-default\n| WHERE service.name == "fraud-check"',
    severityScore: 90,
  },
  {
    queryId: 'red-herring-query',
    ruleId: 'red-herring-rule',
    title: 'Red herring',
    esql: 'FROM logs-synth-default\n| WHERE message LIKE "*Redis*"',
    severityScore: 4,
  },
];
const log = { info: jest.fn() } as unknown as ToolingLog;
const request = jest.mocked(kibanaRequest);

function createEsClient(): Client {
  return {
    indices: {
      refresh: jest.fn().mockResolvedValue({}),
    },
    search: jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': '2026-08-27T10:01:00.000Z',
              detection_id: 'primary-detection',
              rule_uuid: 'primary-rule',
            },
          },
        ],
      },
    }),
    esql: {
      query: jest.fn().mockResolvedValue({
        columns: [{ name: '_index' }, { name: '_id' }],
        values: [['.ds-logs-synth-default-000001', 'source-log']],
      }),
    },
    get: jest.fn().mockResolvedValue({
      _source: {
        '@timestamp': '2026-08-27T09:59:00.000Z',
        message: 'Redis connection timeout after 5000ms',
        service: { name: 'fraud-check' },
      },
    }),
    bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
  } as unknown as Client;
}

function mockCompletedWorkflows(event: Record<string, unknown>): void {
  request
    .mockResolvedValueOnce({
      status: 200,
      data: { workflowExecutionId: 'detection-execution' },
    })
    .mockResolvedValueOnce({
      status: 200,
      data: { status: 'completed' },
    })
    .mockResolvedValueOnce({
      status: 200,
      data: { workflowExecutionId: 'discovery-execution' },
    })
    .mockResolvedValueOnce({
      status: 200,
      data: { status: 'completed' },
    })
    .mockResolvedValueOnce({
      status: 200,
      data: { hits: [event] },
    });
}

describe('runDiscovery', () => {
  beforeEach(() => {
    request.mockReset();
    jest.mocked(log.info).mockClear();
  });

  it('adds post-detection evidence and verifies an open event for the critical rule', async () => {
    const esClient = createEsClient();
    mockCompletedWorkflows({
      title: 'Fraud gateway timeouts',
      status: 'open',
      signals: [{ metadata: { rule_uuid: 'primary-rule' } }],
    });

    await runDiscovery(ctx, seededQueries, esClient, config, log);

    expect(request.mock.calls.map(([, method, path]) => [method, path])).toEqual([
      ['POST', '/api/workflows/workflow/system-significant-events-detection/run'],
      ['GET', '/api/workflows/executions/detection-execution'],
      ['POST', '/api/workflows/workflow/system-significant-events-discovery/run'],
      ['GET', '/api/workflows/executions/discovery-execution'],
      ['GET', expect.stringContaining('/internal/significant_events/events?')],
    ]);
    expect(esClient.esql.query).toHaveBeenCalledWith({
      query: expect.stringContaining('METADATA _index, _id'),
    });
    expect(esClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: expect.arrayContaining([
          expect.objectContaining({
            '@timestamp': '2026-08-27T10:01:01.000Z',
          }),
        ]),
      })
    );
    expect(log.info).toHaveBeenCalledWith(
      'runDiscovery: created active significant event "Fraud gateway timeouts"'
    );
  });

  it('rejects a dismissed event linked to the critical rule', async () => {
    const esClient = createEsClient();
    mockCompletedWorkflows({
      title: 'Fraud gateway timeouts',
      status: 'dismissed',
      signals: [{ metadata: { rule_uuid: 'primary-rule' } }],
    });

    await expect(runDiscovery(ctx, seededQueries, esClient, config, log)).rejects.toThrow(
      'with status dismissed, expected open'
    );
  });
});
