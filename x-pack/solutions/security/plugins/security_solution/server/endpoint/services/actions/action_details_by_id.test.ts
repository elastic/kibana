/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import type { estypes } from '@elastic/elasticsearch';
import type {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getActionDetailsById } from '..';
import { NotFoundError } from '../../errors';
import {
  applyActionsEsSearchMock,
  createActionRequestsEsSearchResultsMock,
  createActionResponsesEsSearchResultsMock,
} from './mocks';
import type {
  EndpointAppContextService,
  ScopedEndpointServices,
} from '../../endpoint_app_context_services';
import { createMockEndpointAppContextService } from '../../mocks';
import { FleetAgentGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_generator';

describe('When using `getActionDetailsById()', () => {
  let esClient: ElasticsearchClientMock;
  let endpointActionGenerator: EndpointActionGenerator;
  let actionRequests: estypes.SearchResponse<LogsEndpointAction>;
  let actionResponses: estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>;
  let endpointAppContextService: EndpointAppContextService;

  const buildScoped = (cpsRead: boolean): ScopedEndpointServices =>
    ({
      isCpsRead: () => cpsRead,
      getEsClient: () => esClient,
    } as unknown as ScopedEndpointServices);

  beforeEach(() => {
    endpointAppContextService = createMockEndpointAppContextService();
    esClient = endpointAppContextService.getInternalEsClient() as ElasticsearchClientMock;
    endpointActionGenerator = new EndpointActionGenerator('seed');
    actionRequests = createActionRequestsEsSearchResultsMock();
    actionResponses = createActionResponsesEsSearchResultsMock();

    applyActionsEsSearchMock(esClient, actionRequests, actionResponses);
    (
      endpointAppContextService.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('should return expected output', async () => {
    (
      endpointAppContextService.getInternalFleetServices().agent.getByIds as jest.Mock
    ).mockResolvedValue([
      new FleetAgentGenerator('seed').generate({
        id: 'agent-a',
        local_metadata: {
          host: {
            name: 'Host-agent-a',
          },
        },
      }),
    ]);
    const doc = actionRequests.hits.hits[0]._source;
    await expect(
      getActionDetailsById(endpointAppContextService, 'default', '123')
    ).resolves.toEqual({
      action: '123',
      agents: ['agent-a'],
      agentType: 'endpoint',
      hosts: { 'agent-a': { name: 'Host-agent-a' } },
      command: expect.any(String),
      completedAt: '2022-04-30T16:08:47.449Z',
      wasSuccessful: true,
      wasCanceled: false,
      errors: undefined,
      id: '123',
      isCompleted: true,
      isExpired: false,
      startedAt: '2022-04-27T16:08:47.449Z',
      comment: doc?.EndpointActions.data.comment,
      status: 'successful',
      createdBy: doc?.user.id,
      parameters: doc?.EndpointActions.data.parameters,
      outputs: {
        'agent-a': {
          content: expect.anything(),
          type: 'json',
        },
      },
      agentState: {
        'agent-a': {
          completedAt: '2022-04-30T16:08:47.449Z',
          isCompleted: true,
          wasSuccessful: true,
          wasCanceled: false,
          errors: undefined,
        },
      },
    });
  });

  it('should use expected filters when querying for Action Request', async () => {
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    await getActionDetailsById(endpointAppContextService, 'default', '123');

    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ term: { action_id: '123' } }],
          },
        },
      }),
      expect.any(Object)
    );
  });

  it('should throw an error if action id does not exist', async () => {
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    actionRequests.hits.hits = [];
    (actionResponses.hits.total as estypes.SearchTotalHits).value = 0;
    actionRequests = endpointActionGenerator.toEsSearchResponse([]);

    await expect(
      getActionDetailsById(endpointAppContextService, 'default', '123')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should have `isExpired` of `true` if NOT complete and expiration is in the past', async () => {
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;
    actionResponses.hits.hits.pop(); // remove the endpoint response

    await expect(
      getActionDetailsById(endpointAppContextService, 'default', '123')
    ).resolves.toEqual(
      expect.objectContaining({
        isExpired: true,
        isCompleted: false,
      })
    );
  });

  it('should have `isExpired` of `false` if complete and expiration is in the past', async () => {
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;

    await expect(
      getActionDetailsById(endpointAppContextService, 'default', '123')
    ).resolves.toEqual(
      expect.objectContaining({
        isExpired: false,
        isCompleted: true,
      })
    );
  });

  it('should not validate against spaces when `bypassSpaceValidation` is `true`', async () => {
    (
      endpointAppContextService.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
    ).mockResolvedValue(undefined);
    await getActionDetailsById(endpointAppContextService, 'default', '123', {
      bypassSpaceValidation: true,
    });

    expect(
      endpointAppContextService.getInternalFleetServices().ensureInCurrentSpace
    ).not.toHaveBeenCalled();
  });

  it('fills linked-project hostnames from the scoped metadata index when Fleet cannot resolve them', async () => {
    const getHostMetadataList = jest.fn().mockResolvedValue({
      data: [
        {
          metadata: {
            agent: { id: 'agent-a' },
            host: { hostname: 'linked-host-a' },
          },
        },
      ],
      total: 1,
    });
    (endpointAppContextService.getEndpointMetadataService as jest.Mock).mockReturnValue({
      getHostMetadataList,
    });
    // Origin Fleet knows nothing about the linked-project agent
    (
      endpointAppContextService.getInternalFleetServices().agent.getByIds as jest.Mock
    ).mockResolvedValue([]);

    const details = await getActionDetailsById(endpointAppContextService, 'default', '123', {
      scoped: buildScoped(true),
    });

    expect(getHostMetadataList).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: 'united.agent.agent.id: ("agent-a")',
        page: 0,
      }),
      expect.anything()
    );
    expect(details.hosts).toEqual({ 'agent-a': { name: 'linked-host-a' } });
  });

  it('matches the linked-project metadata row by Fleet agent id, not the endpoint agent id', async () => {
    // Endpoint metadata's own `agent.id` (`agent-a-endpoint-id`) differs from
    // the Fleet agent id (`agent-a`) the action and the batch kuery
    // (`united.agent.agent.id`) key on. Only `elastic.agent.id` should be
    // used to match; a lookup keyed on the wrong id must not surface a
    // hostname for a different agent.
    const getHostMetadataList = jest.fn().mockResolvedValue({
      data: [
        {
          metadata: {
            agent: { id: 'agent-a-endpoint-id' },
            elastic: { agent: { id: 'agent-a' } },
            host: { hostname: 'linked-host-a' },
          },
        },
      ],
      total: 1,
    });
    (endpointAppContextService.getEndpointMetadataService as jest.Mock).mockReturnValue({
      getHostMetadataList,
    });
    (
      endpointAppContextService.getInternalFleetServices().agent.getByIds as jest.Mock
    ).mockResolvedValue([]);

    const details = await getActionDetailsById(endpointAppContextService, 'default', '123', {
      scoped: buildScoped(true),
    });

    expect(details.hosts).toEqual({ 'agent-a': { name: 'linked-host-a' } });
    // The endpoint's own agent id must never be used as the hostname lookup key.
    expect(details.hosts).not.toHaveProperty('agent-a-endpoint-id');
  });

  it('resolves linked-project hostnames spanning more than one lookup batch', async () => {
    // Production batches unresolvedAgentIds in groups of 500 (HOSTNAME_LOOKUP_BATCH_SIZE).
    // A regression that processes only the first batch, sends an oversized
    // search, or drops the second batch must fail this test.
    const agentIds = Array.from({ length: 501 }, (_, i) => `agent-${i}`);
    actionRequests = createActionRequestsEsSearchResultsMock(agentIds);
    applyActionsEsSearchMock(esClient, actionRequests, actionResponses);

    const getHostMetadataList = jest.fn().mockImplementation(async (queryOptions) => {
      const kuery: string = queryOptions.kuery;
      const idsInBatch = agentIds.filter((id) => kuery.includes(`"${id}"`));
      return {
        data: idsInBatch.map((id) => ({
          metadata: {
            agent: { id },
            elastic: { agent: { id } },
            host: { hostname: `linked-host-${id}` },
          },
        })),
        total: idsInBatch.length,
      };
    });
    (endpointAppContextService.getEndpointMetadataService as jest.Mock).mockReturnValue({
      getHostMetadataList,
    });
    (
      endpointAppContextService.getInternalFleetServices().agent.getByIds as jest.Mock
    ).mockResolvedValue([]);

    const details = await getActionDetailsById(endpointAppContextService, 'default', '123', {
      scoped: buildScoped(true),
    });

    // Two batches: 500 + 1.
    expect(getHostMetadataList).toHaveBeenCalledTimes(2);
    for (const [queryOptions] of getHostMetadataList.mock.calls) {
      expect(queryOptions.pageSize).toBeLessThanOrEqual(500);
    }
    // Every agent, including the one in the second (later) batch, must resolve.
    expect(details.hosts['agent-0']).toEqual({ name: 'linked-host-agent-0' });
    expect(details.hosts['agent-500']).toEqual({ name: 'linked-host-agent-500' });
    expect(Object.keys(details.hosts)).toHaveLength(501);
  });

  it('does not query the scoped metadata index when the read is origin-only', async () => {
    const getHostMetadataList = jest.fn();
    (endpointAppContextService.getEndpointMetadataService as jest.Mock).mockReturnValue({
      getHostMetadataList,
    });
    (
      endpointAppContextService.getInternalFleetServices().agent.getByIds as jest.Mock
    ).mockResolvedValue([]);

    const details = await getActionDetailsById(endpointAppContextService, 'default', '123', {
      scoped: buildScoped(false),
    });

    expect(getHostMetadataList).not.toHaveBeenCalled();
    expect(details.hosts).toEqual({ 'agent-a': { name: '' } });
  });

  it('keeps returning details when the linked-project hostname lookup fails', async () => {
    (endpointAppContextService.getEndpointMetadataService as jest.Mock).mockReturnValue({
      getHostMetadataList: jest.fn().mockRejectedValue(new Error('remote cluster unavailable')),
    });
    (
      endpointAppContextService.getInternalFleetServices().agent.getByIds as jest.Mock
    ).mockResolvedValue([]);

    const details = await getActionDetailsById(endpointAppContextService, 'default', '123', {
      scoped: buildScoped(true),
    });

    expect(details.id).toBe('123');
    expect(details.hosts).toEqual({ 'agent-a': { name: '' } });
  });
});
