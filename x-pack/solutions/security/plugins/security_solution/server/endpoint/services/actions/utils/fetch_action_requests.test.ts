/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { FetchActionRequestsOptions } from './fetch_action_requests';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { applyActionListEsSearchMock } from '../mocks';
import { fetchActionRequests } from './fetch_action_requests';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';

describe('fetchActionRequests()', () => {
  let esClientMock: ElasticsearchClientMock;
  let fetchOptions: FetchActionRequestsOptions;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;

    fetchOptions = {
      logger: loggingSystemMock.create().get(),
      esClient: esClientMock,
      from: 0,
      size: 10,
    };

    applyActionListEsSearchMock(esClientMock);
  });

  it('should return an array of items', async () => {
    await expect(fetchActionRequests(fetchOptions)).resolves.toEqual({
      data: [
        {
          '@timestamp': '2022-04-27T16:08:47.449Z',
          EndpointActions: {
            action_id: '123',
            data: {
              command: 'kill-process',
              comment: '5wb6pu6kh2xix5i',
            },
            expiration: '2022-05-10T16:08:47.449Z',
            input_type: 'endpoint',
            type: 'INPUT_ACTION',
          },
          agent: {
            id: 'agent-a',
          },
          user: {
            id: 'Shanel',
          },
        },
      ],
      total: 1,
      from: 0,
      size: 10,
    });

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: [],
                },
              },
            ],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter using `from` and `size` provided on input', async () => {
    fetchOptions.size = 101;
    fetchOptions.from = 50;
    const response = await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: [],
                },
              },
            ],
          },
        },
        from: 50,
        size: 101,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );

    expect(response).toMatchObject({ size: 101, from: 50 });
  });

  it('should filter by commands', async () => {
    fetchOptions.commands = ['isolate', 'upload'];
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: [{ terms: { 'data.command': ['isolate', 'upload'] } }],
                },
              },
            ],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter by agent types', async () => {
    fetchOptions.agentTypes = ['crowdstrike'];
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [{ bool: { filter: [{ terms: { input_type: ['crowdstrike'] } }] } }],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter by agent ids', async () => {
    fetchOptions.elasticAgentIds = ['agent-1', 'agent-2'];
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [{ bool: { filter: [{ terms: { agents: ['agent-1', 'agent-2'] } }] } }],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter for un-expired', async () => {
    fetchOptions.unExpiredOnly = true;
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [{ bool: { filter: [{ range: { expiration: { gte: 'now' } } }] } }],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter by start date', async () => {
    fetchOptions.startDate = '2024-05-20T14:56:27.352Z';
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [
              { bool: { filter: [{ range: { '@timestamp': { gte: fetchOptions.startDate } } }] } },
            ],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter by end date', async () => {
    fetchOptions.endDate = '2024-05-20T19:56:27.352Z';
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [
              { bool: { filter: [{ range: { '@timestamp': { lte: fetchOptions.endDate } } }] } },
            ],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter by user ids', async () => {
    fetchOptions.userIds = ['user-1', 'user-2'];
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [
              { bool: { filter: [] } },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      bool: { minimum_should_match: 1, should: [{ match: { user_id: 'user-1' } }] },
                    },
                    {
                      bool: { minimum_should_match: 1, should: [{ match: { user_id: 'user-2' } }] },
                    },
                  ],
                },
              },
            ],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter by `manual` action type', async () => {
    fetchOptions.types = ['manual'];
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [{ bool: { filter: [] } }],
            must_not: { exists: { field: 'data.alert_id' } },
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should filter by `automated` action type', async () => {
    fetchOptions.types = ['manual'];
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            must: [{ bool: { filter: [] } }],
            must_not: { exists: { field: 'data.alert_id' } },
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });

  it('should auery using all available filters', async () => {
    fetchOptions.types = ['automated'];
    fetchOptions.userIds = ['user-1'];
    fetchOptions.startDate = '2023-05-20T19:56:27.352Z';
    fetchOptions.endDate = '2024-05-20T19:56:27.352Z';
    fetchOptions.unExpiredOnly = true;
    fetchOptions.elasticAgentIds = ['agent-1', 'agent-2'];
    fetchOptions.agentTypes = ['sentinel_one'];
    fetchOptions.commands = ['kill-process'];
    await fetchActionRequests(fetchOptions);

    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: {
          bool: {
            filter: { exists: { field: 'data.alert_id' } },
            must: [
              {
                bool: {
                  filter: [
                    { range: { '@timestamp': { gte: '2023-05-20T19:56:27.352Z' } } },
                    { range: { '@timestamp': { lte: '2024-05-20T19:56:27.352Z' } } },
                    { terms: { 'data.command': ['kill-process'] } },
                    { terms: { input_type: ['sentinel_one'] } },
                    { terms: { agents: ['agent-1', 'agent-2'] } },
                    { range: { expiration: { gte: 'now' } } },
                  ],
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [{ match: { user_id: 'user-1' } }],
                },
              },
            ],
          },
        },
        from: 0,
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
      { ignore: [404] }
    );
  });
});
