/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AlertingServerStart as AlertingV2ServerStart } from '@kbn/alerting-v2-plugin/server';
import { createDetectionSnapshotSources } from './detection_snapshot_sources';

const setup = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soRepository = savedObjectsRepositoryMock.create();
  const findRules = jest.fn();
  const getRulesClientWithRequestInSpace = jest.fn().mockResolvedValue({ findRules });
  const getAll = jest.fn();
  const request = httpServerMock.createKibanaRequest();
  const sources = createDetectionSnapshotSources({
    request,
    esClient,
    soRepository,
    listSpaceIds: async () => ['default'],
    alertingVTwo: { getRulesClientWithRequestInSpace } as unknown as AlertingV2ServerStart,
    actions: {
      getUnsecuredActionsClient: () => ({ getAll }),
    } as unknown as ActionsPluginStart,
    isMemoryEnabled: false,
    logger: loggingSystemMock.createLogger(),
  });
  return { sources, esClient, findRules, getRulesClientWithRequestInSpace, getAll, request };
};

describe('createDetectionSnapshotSources', () => {
  it('reads enabled alert rules with the task request in the given space', async () => {
    const { sources, findRules, getRulesClientWithRequestInSpace, request } = setup();
    findRules.mockResolvedValue({
      items: [{ id: 'rule-1', metadata: { name: 'checkout latency' } }],
      total: 7,
    });

    await expect(
      sources.findEligibleRules('marketing', { page: 2, perPage: 500 })
    ).resolves.toEqual({
      rules: [{ id: 'rule-1', name: 'checkout latency', tags: [] }],
      total: 7,
    });
    expect(getRulesClientWithRequestInSpace).toHaveBeenCalledWith(request, 'marketing');
    expect(findRules).toHaveBeenCalledWith({
      filter: 'kind: alert and enabled: true',
      page: 2,
      perPage: 500,
      sortField: 'name',
      sortOrder: 'asc',
    });
  });

  it('lists one alert source per connector that imports alerts', async () => {
    const { sources, getAll } = setup();
    getAll.mockResolvedValue([
      { actionTypeId: '.datadog' },
      { actionTypeId: '.slack2' },
      { actionTypeId: '.datadog' },
    ]);

    await expect(sources.listExternalConnectorSources('default')).resolves.toEqual([
      'datadog',
      'datadog',
    ]);
  });

  it('splits the alert activity of a space by source', async () => {
    const { sources, esClient } = setup();
    esClient.search.mockResponse({
      aggregations: {
        significant_events: { alerts: { value: 3 } },
        external: { alerts: { value: 7 }, sources: { value: 2 } },
        connector_sources: { buckets: [{ key: 'datadog' }] },
      },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);

    await expect(sources.getAlertActivity('marketing', ['datadog', 'datadog'])).resolves.toEqual({
      significant_events_24h: 3,
      external_alerts_24h: 7,
      external_sources_active_24h: 2,
      activeConnectorSources: ['datadog'],
    });

    const [{ index, query, aggs }] = esClient.search.mock.calls[0] as [
      { index: string; query: unknown; aggs: Record<string, unknown> }
    ];
    expect(index).toBe('.rule-events');
    expect(query).toEqual({
      bool: {
        filter: [
          { term: { space_id: 'marketing' } },
          { range: { '@timestamp': { gte: 'now-24h' } } },
        ],
      },
    });
    expect(aggs.external).toMatchObject({
      filter: {
        bool: {
          must_not: [{ term: { source: 'internal' } }, { prefix: { source: 'elastic.' } }],
        },
      },
    });
    expect(aggs.connector_sources).toEqual({
      terms: { field: 'source', include: ['datadog'], size: 1 },
    });
  });

  it('skips the connector aggregation without connector sources', async () => {
    const { sources, esClient } = setup();
    esClient.search.mockResponse({} as Awaited<ReturnType<typeof esClient.search>>);

    await expect(sources.getAlertActivity('default', [])).resolves.toEqual({
      significant_events_24h: 0,
      external_alerts_24h: 0,
      external_sources_active_24h: 0,
      activeConnectorSources: [],
    });
    const [{ aggs }] = esClient.search.mock.calls[0] as [{ aggs: Record<string, unknown> }];
    expect(aggs).not.toHaveProperty('connector_sources');
  });
});
