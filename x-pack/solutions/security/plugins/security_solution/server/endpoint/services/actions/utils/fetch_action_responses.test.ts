/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyActionListEsSearchMock } from '../mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { fetchActionResponses } from './fetch_action_responses';
import { createMockEndpointAppContextService } from '../../../mocks';
import { BaseDataGenerator } from '../../../../../common/endpoint/data_generators/base_data_generator';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN } from '../../../../../common/endpoint/constants';
import { ACTIONS_SEARCH_PAGE_SIZE } from '../constants';

describe('fetchActionResponses()', () => {
  let esClientMock: ElasticsearchClientMock;
  const endpointServiceMock = createMockEndpointAppContextService();

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
    applyActionListEsSearchMock(esClientMock);
    (endpointServiceMock.isCcsEnabled as jest.Mock).mockResolvedValue(false);
    (endpointServiceMock.isCpsActive as jest.Mock).mockResolvedValue(false);
  });

  it('should return results', async () => {
    await expect(
      fetchActionResponses({ esClient: esClientMock, endpointService: endpointServiceMock })
    ).resolves.toEqual({
      endpointResponses: [
        {
          action_id: '123',
          agent_id: 'agent-a',
          completed_at: '2022-04-30T10:53:59.449Z',
          error: '',
          '@timestamp': '2022-04-30T16:08:47.449Z',
          action_data: {
            command: expect.any(String),
            comment: '',
            parameter: undefined,
          },
          started_at: '2022-04-30T12:56:00.449Z',
        },
        {
          '@timestamp': '2022-04-30T16:08:47.449Z',
          EndpointActions: {
            action_id: '123',
            completed_at: '2022-04-30T10:53:59.449Z',
            data: {
              command: expect.any(String),
              comment: '',
              output: {
                content: expect.anything(),
                type: 'json',
              },
            },
            started_at: '2022-04-30T12:56:00.449Z',
          },
          agent: {
            id: 'agent-a',
          },
          error: undefined,
        },
      ],
      fleetResponses: [
        {
          '@timestamp': '2022-04-30T16:08:47.449Z',
          action_data: {
            command: expect.any(String),
            comment: '',
            parameter: undefined,
          },
          action_id: '123',
          agent_id: 'agent-a',
          completed_at: '2022-04-30T10:53:59.449Z',
          error: '',
          started_at: '2022-04-30T12:56:00.449Z',
        },
        {
          '@timestamp': '2022-04-30T16:08:47.449Z',
          EndpointActions: {
            action_id: '123',
            completed_at: '2022-04-30T10:53:59.449Z',
            data: {
              command: expect.any(String),
              comment: '',
              output: {
                content: expect.anything(),
                type: 'json',
              },
            },
            started_at: '2022-04-30T12:56:00.449Z',
          },
          agent: {
            id: 'agent-a',
          },
          error: undefined,
        },
      ],
    });
  });

  it('should return empty array with no responses exist', async () => {
    applyActionListEsSearchMock(esClientMock, undefined, BaseDataGenerator.toEsSearchResponse([]));

    await expect(
      fetchActionResponses({ esClient: esClientMock, endpointService: endpointServiceMock })
    ).resolves.toEqual({
      endpointResponses: [],
      fleetResponses: [],
    });
  });

  it('should query both fleet and endpoint indexes', async () => {
    await fetchActionResponses({ esClient: esClientMock, endpointService: endpointServiceMock });
    const expectedQuery = {
      query: {
        bool: {
          filter: [],
        },
      },
    };

    expect(esClientMock.search).toHaveBeenCalledWith(
      { index: AGENT_ACTIONS_RESULTS_INDEX, size: ACTIONS_SEARCH_PAGE_SIZE, ...expectedQuery },
      { ignore: [404] }
    );
    expect(esClientMock.search).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        size: ACTIONS_SEARCH_PAGE_SIZE,
        ...expectedQuery,
      },
      { ignore: [404] }
    );
  });

  it('should query CCS-prefixed response indexes when CCS is enabled', async () => {
    (endpointServiceMock.isCcsEnabled as jest.Mock).mockResolvedValue(true);
    await fetchActionResponses({ esClient: esClientMock, endpointService: endpointServiceMock });

    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `${AGENT_ACTIONS_RESULTS_INDEX},*:${AGENT_ACTIONS_RESULTS_INDEX}`,
      }),
      { ignore: [404] }
    );
    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `${ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN},*:${ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN}`,
      }),
      { ignore: [404] }
    );
  });

  it('should not CCS-prefix the endpoint response index once the read fans out', async () => {
    (endpointServiceMock.isCcsEnabled as jest.Mock).mockResolvedValue(true);
    (endpointServiceMock.isCpsActive as jest.Mock).mockResolvedValue(true);
    const scopedEsClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    applyActionListEsSearchMock(scopedEsClient);
    (endpointServiceMock.getReadEsClient as jest.Mock).mockResolvedValue(scopedEsClient);

    const scoped = await endpointServiceMock.asScoped(httpServerMock.createKibanaRequest());
    await fetchActionResponses({
      esClient: esClientMock,
      endpointService: endpointServiceMock,
      scoped,
    });

    expect(scopedEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN }),
      { ignore: [404] }
    );
    // The Fleet half never fans out, so it keeps its CCS patterns
    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `${AGENT_ACTIONS_RESULTS_INDEX},*:${AGENT_ACTIONS_RESULTS_INDEX}`,
      }),
      { ignore: [404] }
    );
  });

  it('should filter by agentIds', async () => {
    await fetchActionResponses({
      esClient: esClientMock,
      endpointService: endpointServiceMock,
      agentIds: ['a', 'b', 'c'],
    });
    const expectedQuery = {
      query: { bool: { filter: [{ terms: { agent_id: ['a', 'b', 'c'] } }] } },
    };

    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: AGENT_ACTIONS_RESULTS_INDEX, ...expectedQuery }),
      { ignore: [404] }
    );
    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        ...expectedQuery,
      }),
      { ignore: [404] }
    );
  });

  it('should filter by action ids', async () => {
    await fetchActionResponses({
      esClient: esClientMock,
      endpointService: endpointServiceMock,
      actionIds: ['a', 'b', 'c'],
    });
    const expectedQuery = {
      query: { bool: { filter: [{ terms: { action_id: ['a', 'b', 'c'] } }] } },
    };

    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: AGENT_ACTIONS_RESULTS_INDEX, ...expectedQuery }),
      { ignore: [404] }
    );
    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        ...expectedQuery,
      }),
      { ignore: [404] }
    );
  });

  it('should filter by both agent and action ids', async () => {
    await fetchActionResponses({
      esClient: esClientMock,
      endpointService: endpointServiceMock,
      agentIds: ['1', '2'],
      actionIds: ['a', 'b', 'c'],
    });
    const expectedQuery = {
      query: {
        bool: {
          filter: [{ terms: { agent_id: ['1', '2'] } }, { terms: { action_id: ['a', 'b', 'c'] } }],
        },
      },
    };

    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: AGENT_ACTIONS_RESULTS_INDEX, ...expectedQuery }),
      { ignore: [404] }
    );
    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        ...expectedQuery,
      }),
      { ignore: [404] }
    );
  });

  describe('and CPS is enabled', () => {
    let readEsClientMock: ElasticsearchClientMock;
    const request = httpServerMock.createKibanaRequest();

    beforeEach(() => {
      readEsClientMock = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      applyActionListEsSearchMock(readEsClientMock);

      endpointServiceMock.isCpsActive.mockResolvedValue(true);
      endpointServiceMock.getReadEsClient.mockResolvedValue(readEsClientMock);
    });

    afterEach(() => {
      endpointServiceMock.isCpsActive.mockResolvedValue(false);
    });

    it('should read the Endpoint response index as the request user so it can fan out', async () => {
      await fetchActionResponses({
        esClient: esClientMock,
        endpointService: endpointServiceMock,
        scoped: await endpointServiceMock.asScoped(request),
        actionIds: ['a'],
      });

      expect(endpointServiceMock.getReadEsClient).toHaveBeenCalledWith(request);
      expect(readEsClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN }),
        { ignore: [404] }
      );
    });

    it('should keep the Fleet response index on the internal client, since CPS excludes it', async () => {
      await fetchActionResponses({
        esClient: esClientMock,
        endpointService: endpointServiceMock,
        scoped: await endpointServiceMock.asScoped(request),
        actionIds: ['a'],
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: AGENT_ACTIONS_RESULTS_INDEX }),
        { ignore: [404] }
      );
      expect(readEsClientMock.search).not.toHaveBeenCalledWith(
        expect.objectContaining({ index: AGENT_ACTIONS_RESULTS_INDEX }),
        expect.anything()
      );
    });

    it('should add no space filter of its own, because the read is bounded by action ids', async () => {
      await fetchActionResponses({
        esClient: esClientMock,
        endpointService: endpointServiceMock,
        scoped: await endpointServiceMock.asScoped(request),
        actionIds: ['a'],
      });

      expect(readEsClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: [{ terms: { action_id: ['a'] } }] } },
        }),
        { ignore: [404] }
      );
    });
  });
});
