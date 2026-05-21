/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPendingActionsSummary } from '../../..';
import { SentinelOneAgentStatusClient } from './sentinel_one_agent_status_client';
import type { AgentStatusClientOptions } from '../lib/base_agent_status_client';
import { AgentStatusClientError } from '../errors';
import { HostStatus } from '../../../../../../common/endpoint/types';
import { responseActionsClientMock } from '../../../actions/clients/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SentinelOneDataGenerator } from '../../../../../../common/endpoint/data_generators/sentinelone_data_generator';

jest.mock('../../..', () => ({
  getPendingActionsSummary: jest.fn().mockResolvedValue([]),
}));

const getPendingActionsSummaryMock = getPendingActionsSummary as jest.Mock;

describe('SentinelOneAgentStatusClient', () => {
  let constructorOptions: AgentStatusClientOptions;
  let client: SentinelOneAgentStatusClient;
  const mockOptions = responseActionsClientMock.createConstructorOptions();
  const s1Generator = new SentinelOneDataGenerator('seed');

  beforeEach(() => {
    constructorOptions = {
      esClient: mockOptions.esClient,
      soClient: savedObjectsClientMock.create(),
      endpointService: mockOptions.endpointService,
      spaceId: 'default',
    };

    client = new SentinelOneAgentStatusClient(constructorOptions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgentStatuses()', () => {
    it('should call ES search with the correct query for the given agent IDs', async () => {
      const agentIds = ['agent-1', 'agent-2'];
      (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
        s1Generator.generateAgentEsSearchResponse([
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: 'agent-1' } } },
          }),
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: 'agent-2' } } },
          }),
        ])
      );

      await client.getAgentStatuses(agentIds);

      expect(constructorOptions.esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'logs-sentinel_one.agent-*',
          query: {
            bool: {
              should: [
                { bool: { filter: [{ terms: { 'sentinel_one.agent.agent.id': agentIds } }] } },
                { bool: { filter: [{ terms: { 'sentinel_one.agent.uuid': agentIds } }] } },
              ],
              minimum_should_match: 1,
            },
          },
          collapse: expect.objectContaining({
            field: 'sentinel_one.agent.agent.id',
          }),
        }),
        { ignore: [404] }
      );
    });

    it('should call getPendingActionsSummary with the correct space and agent IDs', async () => {
      const agentIds = ['agent-1', 'agent-2'];
      (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
        s1Generator.generateAgentEsSearchResponse([
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: 'agent-1' } } },
          }),
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: 'agent-2' } } },
          }),
        ])
      );

      await client.getAgentStatuses(agentIds);

      expect(getPendingActionsSummaryMock).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        agentIds
      );
    });

    it('should include pending actions in the response', async () => {
      const agentId = 'agent-1';
      (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
        s1Generator.generateAgentEsSearchResponse([
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: agentId } } },
          }),
        ])
      );
      getPendingActionsSummaryMock.mockResolvedValueOnce([
        { agent_id: agentId, pending_actions: { isolate: 2, unisolate: 1 } },
      ]);

      const result = await client.getAgentStatuses([agentId]);

      expect(result[agentId].pendingActions).toEqual({ isolate: 2, unisolate: 1 });
    });

    it('should return empty pendingActions when no pending actions exist for agent', async () => {
      const agentId = 'agent-1';
      (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
        s1Generator.generateAgentEsSearchResponse([
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: agentId } } },
          }),
        ])
      );
      getPendingActionsSummaryMock.mockResolvedValueOnce([]);

      const result = await client.getAgentStatuses([agentId]);

      expect(result[agentId].pendingActions).toEqual({});
    });

    describe('found field', () => {
      it('should set found:true when the agent uuid matches the requested agentId', async () => {
        const agentId = 'agent-uuid-1';
        const hit = s1Generator.generateAgentEsSearchHit({
          sentinel_one: { agent: { agent: { id: 'different-agent-id' }, uuid: agentId } },
        });
        // Field key is agentId (matched via uuid) but source agent.id is different
        hit.fields = { 'sentinel_one.agent.agent.id': [agentId] };
        (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
          s1Generator.generateAgentEsSearchResponse([hit])
        );

        const result = await client.getAgentStatuses([agentId]);

        expect(result[agentId].found).toBe(true);
      });

      it('should set found:true when agent.id matches the requested agentId', async () => {
        const agentId = 'agent-id-1';
        (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
          s1Generator.generateAgentEsSearchResponse([
            s1Generator.generateAgentEsSearchHit({
              sentinel_one: { agent: { agent: { id: agentId }, uuid: 'different-uuid' } },
            }),
          ])
        );

        const result = await client.getAgentStatuses([agentId]);

        expect(result[agentId].found).toBe(true);
      });

      it('should set found:false when neither uuid nor agent.id matches the requested agentId', async () => {
        const agentId = 'agent-1';
        const hit = s1Generator.generateAgentEsSearchHit({
          sentinel_one: { agent: { agent: { id: 'some-other-id' }, uuid: 'some-other-uuid' } },
        });
        // Field key is agentId but source has different ids → found:false
        hit.fields = { 'sentinel_one.agent.agent.id': [agentId] };
        (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
          s1Generator.generateAgentEsSearchResponse([hit])
        );

        const result = await client.getAgentStatuses([agentId]);

        expect(result[agentId].found).toBe(false);
      });
    });

    describe('isolated field', () => {
      it.each`
        networkStatus      | expectedIsolated
        ${'disconnected'}  | ${true}
        ${'connected'}     | ${false}
        ${'connecting'}    | ${false}
        ${'disconnecting'} | ${false}
      `(
        'should set isolated:$expectedIsolated when network_status is "$networkStatus"',
        async ({ networkStatus, expectedIsolated }) => {
          const agentId = 'agent-1';
          (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
            s1Generator.generateAgentEsSearchResponse([
              s1Generator.generateAgentEsSearchHit({
                sentinel_one: { agent: { agent: { id: agentId }, network_status: networkStatus } },
              }),
            ])
          );

          const result = await client.getAgentStatuses([agentId]);

          expect(result[agentId].isolated).toBe(expectedIsolated);
        }
      );
    });

    describe('status field', () => {
      it.each`
        description                       | agentOverrides                                                            | expectedStatus
        ${'is_active is true'}            | ${{ is_active: true }}                                                    | ${HostStatus.HEALTHY}
        ${'is_active is false (offline)'} | ${{ is_active: false }}                                                   | ${HostStatus.OFFLINE}
        ${'is_pending_uninstall is true'} | ${{ is_active: false, is_pending_uninstall: true }}                       | ${HostStatus.UNENROLLED}
        ${'is_uninstalled is true'}       | ${{ is_active: false, is_uninstalled: true }}                             | ${HostStatus.UNENROLLED}
        ${'both pending and uninstalled'} | ${{ is_active: false, is_pending_uninstall: true, is_uninstalled: true }} | ${HostStatus.UNENROLLED}
      `(
        'should map to $expectedStatus when $description',
        async ({ agentOverrides, expectedStatus }) => {
          const agentId = 'agent-1';
          (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
            s1Generator.generateAgentEsSearchResponse([
              s1Generator.generateAgentEsSearchHit({
                sentinel_one: { agent: { agent: { id: agentId }, ...agentOverrides } },
              }),
            ])
          );

          const result = await client.getAgentStatuses([agentId]);

          expect(result[agentId].status).toBe(expectedStatus);
        }
      );
    });

    it('should populate lastSeen from sentinel_one.agent.last_active_date', async () => {
      const agentId = 'agent-1';
      const lastActiveDate = '2024-03-15T08:30:00Z';
      (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
        s1Generator.generateAgentEsSearchResponse([
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: agentId }, last_active_date: lastActiveDate } },
          }),
        ])
      );

      const result = await client.getAgentStatuses([agentId]);

      expect(result[agentId].lastSeen).toBe(lastActiveDate);
    });

    it('should return the correct agentType of sentinel_one', async () => {
      const agentId = 'agent-1';
      (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
        s1Generator.generateAgentEsSearchResponse([
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: agentId } } },
          }),
        ])
      );

      const result = await client.getAgentStatuses([agentId]);

      expect(result[agentId].agentType).toBe('sentinel_one');
    });

    it('should return correct status records for multiple agents', async () => {
      const agentIds = ['agent-1', 'agent-2'];
      (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
        s1Generator.generateAgentEsSearchResponse([
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: {
              agent: { agent: { id: 'agent-1' }, is_active: true, network_status: 'connected' },
            },
          }),
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: {
              agent: { agent: { id: 'agent-2' }, is_active: false, network_status: 'disconnected' },
            },
          }),
        ])
      );
      getPendingActionsSummaryMock.mockResolvedValueOnce([
        { agent_id: 'agent-1', pending_actions: { isolate: 1 } },
      ]);

      const result = await client.getAgentStatuses(agentIds);

      expect(result).toEqual({
        'agent-1': {
          agentId: 'agent-1',
          agentType: 'sentinel_one',
          found: true,
          isolated: false,
          lastSeen: '2023-06-15T12:00:00Z',
          status: HostStatus.HEALTHY,
          pendingActions: { isolate: 1 },
        },
        'agent-2': {
          agentId: 'agent-2',
          agentType: 'sentinel_one',
          found: true,
          isolated: true,
          lastSeen: '2023-06-15T12:00:00Z',
          status: HostStatus.OFFLINE,
          pendingActions: {},
        },
      });
    });

    it('should use empty string for lastSeen when last_active_date is missing', async () => {
      const agentId = 'agent-1';
      (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
        s1Generator.generateAgentEsSearchResponse([
          s1Generator.generateAgentEsSearchHit({
            sentinel_one: { agent: { agent: { id: agentId }, last_active_date: '' } },
          }),
        ])
      );

      const result = await client.getAgentStatuses([agentId]);

      expect(result[agentId].lastSeen).toBe('');
    });

    describe('error handling', () => {
      it('should log an error and return default response for all agents when ES search fails', async () => {
        const agentIds = ['agent-1', 'agent-2'];
        const searchError = new Error('ES search failed');
        (constructorOptions.esClient.search as jest.Mock).mockRejectedValueOnce(searchError);

        const result = await client.getAgentStatuses(agentIds);

        expect(result).toEqual({
          'agent-1': {
            agentId: 'agent-1',
            agentType: 'sentinel_one',
            error: 'ES search failed',
            found: false,
            isolated: false,
            lastSeen: '',
            pendingActions: {},
            status: HostStatus.OFFLINE,
          },
          'agent-2': {
            agentId: 'agent-2',
            agentType: 'sentinel_one',
            error: 'ES search failed',
            found: false,
            isolated: false,
            lastSeen: '',
            pendingActions: {},
            status: HostStatus.OFFLINE,
          },
        });
      });

      it('should log an AgentStatusClientError when ES search fails', async () => {
        const agentIds = ['agent-1'];
        (constructorOptions.esClient.search as jest.Mock).mockRejectedValueOnce(
          new Error('connection refused')
        );

        await client.getAgentStatuses(agentIds);

        // @ts-expect-error accessing protected log property
        expect(client.log.error).toHaveBeenCalledWith(expect.any(AgentStatusClientError));
      });

      it('should log an error and return default response when getPendingActionsSummary fails', async () => {
        const agentIds = ['agent-1'];
        (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
          s1Generator.generateAgentEsSearchResponse([
            s1Generator.generateAgentEsSearchHit({
              sentinel_one: { agent: { agent: { id: 'agent-1' } } },
            }),
          ])
        );
        getPendingActionsSummaryMock.mockRejectedValueOnce(new Error('pending actions error'));

        const result = await client.getAgentStatuses(agentIds);

        expect(result).toEqual({
          'agent-1': expect.objectContaining({
            agentId: 'agent-1',
            agentType: 'sentinel_one',
            found: false,
            isolated: false,
            lastSeen: '',
            pendingActions: {},
            status: HostStatus.OFFLINE,
            error: 'pending actions error',
          }),
        });
      });

      it('should return default response when ES search returns no hits', async () => {
        const agentIds = ['agent-1'];
        (constructorOptions.esClient.search as jest.Mock).mockResolvedValueOnce(
          s1Generator.generateAgentEsSearchResponse([])
        );

        const result = await client.getAgentStatuses(agentIds);

        // When agentId is not found in map, accessing agentInfo.agent.id throws → error handler
        expect(result).toEqual({
          'agent-1': expect.objectContaining({
            agentId: 'agent-1',
            agentType: 'sentinel_one',
            found: false,
            isolated: false,
            lastSeen: '',
            pendingActions: {},
            status: HostStatus.OFFLINE,
          }),
        });
      });
    });
  });
});
