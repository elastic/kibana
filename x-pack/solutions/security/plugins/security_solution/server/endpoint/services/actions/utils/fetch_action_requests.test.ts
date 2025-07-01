/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchActionRequestsOptions } from './fetch_action_requests';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { applyActionListEsSearchMock } from '../mocks';
import { fetchActionRequests } from './fetch_action_requests';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { createMockEndpointAppContextService } from '../../../mocks';
import { REF_DATA_KEY_INITIAL_VALUE, REF_DATA_KEYS } from '../../../lib/reference_data';
import { set } from '@kbn/safer-lodash-set';
import { ALLOWED_ACTION_REQUEST_TAGS } from '../constants';

describe('fetchActionRequests()', () => {
  let esClientMock: ElasticsearchClientMock;
  let fetchOptions: FetchActionRequestsOptions;

  beforeEach(() => {
    fetchOptions = {
      spaceId: 'default',
      endpointService: createMockEndpointAppContextService(),
      from: 0,
      size: 10,
    };
    esClientMock = fetchOptions.endpointService.getInternalEsClient() as ElasticsearchClientMock;
    applyActionListEsSearchMock(esClientMock);
  });

  it('should return an array of items', async () => {
    await expect(fetchActionRequests(fetchOptions)).resolves.toEqual({
      data: expect.any(Array),
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

  describe('and space awareness feature is enabled', () => {
    beforeEach(() => {
      // @ts-expect-error
      fetchOptions.endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
        true;
    });

    it('should fetch all policy IDs for all package names supporting response actions', async () => {
      await fetchActionRequests(fetchOptions);

      expect(
        fetchOptions.endpointService.getInternalFleetServices().packagePolicy.fetchAllItemIds
      ).toHaveBeenCalledWith(expect.anything(), {
        kuery:
          'ingest-package-policies.package.name: (endpoint OR sentinel_one OR crowdstrike OR microsoft_defender_endpoint OR m365_defender)',
      });
    });

    it('should add integration policy IDs to search filtering criteria', async () => {
      await fetchActionRequests(fetchOptions);

      expect(fetchOptions.endpointService.getInternalEsClient().search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                {
                  bool: {
                    filter: { terms: { 'agent.policy.integrationPolicyId': ['111', '222'] } },
                  },
                },
                { bool: { filter: [] } },
              ],
            },
          },
        }),
        expect.anything()
      );
    });

    it('should include search filter for deleted integration policy tag when ref. data has one defined', async () => {
      (fetchOptions.endpointService.getReferenceDataClient().get as jest.Mock).mockResolvedValue(
        set(
          REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.orphanResponseActionsSpace](),
          'metadata.spaceId',
          'bar'
        )
      );
      fetchOptions.spaceId = 'bar';

      await fetchActionRequests(fetchOptions);

      expect(fetchOptions.endpointService.getInternalEsClient().search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                {
                  bool: {
                    filter: {
                      bool: {
                        should: [
                          { terms: { 'agent.policy.integrationPolicyId': ['111', '222'] } },
                          { term: { tags: ALLOWED_ACTION_REQUEST_TAGS.integrationPolicyDeleted } },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  },
                },
                { bool: { filter: [] } },
              ],
            },
          },
        }),
        expect.anything()
      );
    });
  });
});
