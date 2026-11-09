/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPolicyResponseSchema } from '../../../../common/api/endpoint';
import type { GetPolicyResponseByAgentIdOptions } from './service';
import { getESQueryPolicyResponseByAgentID, getPolicyResponseByAgentId } from './service';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { createMockEndpointAppContextService } from '../../mocks';
import { FleetAgentGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_generator';
import type { EndpointInternalFleetServicesInterfaceMocked } from '../../services/fleet/endpoint_fleet_services_factory.mocks';
import { createEndpointFleetServicesFactoryMock } from '../../services/fleet/endpoint_fleet_services_factory.mocks';
import { applyEsClientSearchMock } from '../../mocks/utils.mock';
import { METADATA_UNITED_INDEX, policyIndexPattern } from '../../../../common/endpoint/constants';
import { EndpointPolicyResponseGenerator } from '../../../../common/endpoint/data_generators/endpoint_policy_response_generator';

describe('Policy Response Services', () => {
  describe('test policy handlers schema', () => {
    it('validate that get policy response query schema', async () => {
      expect(
        GetPolicyResponseSchema.query.validate({
          agentId: 'id',
        })
      ).toBeTruthy();

      expect(() => GetPolicyResponseSchema.query.validate({})).toThrow();
    });
  });

  describe('test policy query', () => {
    it('queries for the correct host', async () => {
      const agentId = 'f757d3c0-e874-11ea-9ad9-015510b487f4';
      const query = getESQueryPolicyResponseByAgentID(agentId, 'anyindex');
      expect(query.query?.bool?.filter).toEqual({ term: { 'agent.id': agentId } });
    });

    it('filters out initial policy by ID', async () => {
      const query = getESQueryPolicyResponseByAgentID(
        'f757d3c0-e874-11ea-9ad9-015510b487f4',
        'anyindex'
      );
      expect(query.query?.bool?.must_not).toEqual({
        term: {
          'Endpoint.policy.applied.id': '00000000-0000-0000-0000-000000000000',
        },
      });
    });
  });

  describe('getPolicyResponseByAgentId()', () => {
    let esClientMock: ElasticsearchClientMock;
    let fleetServicesMock: EndpointInternalFleetServicesInterfaceMocked;
    let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;
    let fetchOptions: GetPolicyResponseByAgentIdOptions;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      fleetServicesMock = createEndpointFleetServicesFactoryMock().service.asInternalUser();
      endpointServiceMock = createMockEndpointAppContextService();
      fetchOptions = {
        agentID: '1-2-3',
        esClient: esClientMock,
        endpointService: endpointServiceMock,
        fleetServices: fleetServicesMock,
        ccsEnabled: false,
      };

      applyEsClientSearchMock({
        esClientMock,
        index: policyIndexPattern,
        response: EndpointPolicyResponseGenerator.toEsSearchResponse([
          EndpointPolicyResponseGenerator.toEsSearchHit(
            new EndpointPolicyResponseGenerator('seed').generate({ agent: { id: '1-2-3' } })
          ),
        ]),
      });
    });

    it('should search using the agent id provided on input', async () => {
      await getPolicyResponseByAgentId(fetchOptions);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.objectContaining({
                term: expect.objectContaining({
                  'agent.id': '1-2-3',
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should search using the CCS-prefixed policy index when ccs is enabled', async () => {
      fetchOptions.ccsEnabled = true;
      await getPolicyResponseByAgentId(fetchOptions);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${policyIndexPattern},*:${policyIndexPattern}`,
        })
      );
    });

    it('should validate that agent id is in current space', async () => {
      await getPolicyResponseByAgentId(fetchOptions);

      expect(fleetServicesMock.ensureInCurrentSpace).toHaveBeenCalledWith({ agentIds: ['1-2-3'] });
    });

    describe('and CPS is enabled', () => {
      let readEsClientMock: ElasticsearchClientMock;
      let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

      const mockPolicyResponseFrom = (index: string) => {
        applyEsClientSearchMock({
          esClientMock: readEsClientMock,
          index: policyIndexPattern,
          response: EndpointPolicyResponseGenerator.toEsSearchResponse([
            EndpointPolicyResponseGenerator.toEsSearchHit(
              new EndpointPolicyResponseGenerator('seed').generate({ agent: { id: '1-2-3' } }),
              index
            ),
          ]),
        });
      };

      beforeEach(async () => {
        readEsClientMock = elasticsearchServiceMock.createElasticsearchClient();
        mockPolicyResponseFrom('.ds-metrics-endpoint.policy-default-000001');

        endpointServiceMock.isCpsActive.mockResolvedValue(true);
        endpointServiceMock.getReadEsClient.mockResolvedValue(readEsClientMock);
        request = httpServerMock.createKibanaRequest();
        fetchOptions.scoped = await endpointServiceMock.asScoped(request);
      });

      it('should read as the request user so the search can fan out to linked projects', async () => {
        await getPolicyResponseByAgentId(fetchOptions);

        expect(endpointServiceMock.getReadEsClient).toHaveBeenCalledWith(request);
        expect(readEsClientMock.search).toHaveBeenCalled();
        expect(esClientMock.search).not.toHaveBeenCalled();
      });

      it('should not search CCS remote outputs, so that a prefixed index can only mean fan-in', async () => {
        fetchOptions.ccsEnabled = true;
        await getPolicyResponseByAgentId(fetchOptions);

        expect(readEsClientMock.search).toHaveBeenCalledWith(
          expect.objectContaining({ index: policyIndexPattern })
        );
      });

      it('should return the policy response of an agent that is not enrolled in this project', async () => {
        mockPolicyResponseFrom('linked:.ds-metrics-endpoint.policy-default-000001');
        // The united-index check confirms this agent is visible in the active space
        applyEsClientSearchMock({
          esClientMock: readEsClientMock,
          index: METADATA_UNITED_INDEX,
          response: {
            took: 1,
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: {
              total: { value: 1, relation: 'eq' },
              max_score: 1.0,
              hits: [
                {
                  _index: METADATA_UNITED_INDEX,
                  _id: '1-2-3',
                  _score: 1.0,
                  fields: { 'united.endpoint.agent.id': ['1-2-3'] },
                },
              ],
            },
          },
        });
        fleetServicesMock.ensureInCurrentSpace.mockRejectedValue(
          new Error('Agent ID(s) not found: [1-2-3]')
        );
        (
          endpointServiceMock.getInternalFleetServices(undefined, true).fetchAgentsById as jest.Mock
        ).mockResolvedValue([]);

        await expect(getPolicyResponseByAgentId(fetchOptions)).resolves.toEqual(
          expect.objectContaining({ policy_response: expect.anything() })
        );
      });

      it('should render a fanned-in agent whose united document matches the active space', async () => {
        mockPolicyResponseFrom('linked:.ds-metrics-endpoint.policy-default-000001');
        applyEsClientSearchMock({
          esClientMock: readEsClientMock,
          index: METADATA_UNITED_INDEX,
          response: {
            took: 1,
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: {
              total: { value: 1, relation: 'eq' },
              max_score: 1.0,
              hits: [
                {
                  _index: METADATA_UNITED_INDEX,
                  _id: '1-2-3',
                  _score: 1.0,
                  fields: { 'united.endpoint.agent.id': ['1-2-3'] },
                },
              ],
            },
          },
        });
        fleetServicesMock.ensureInCurrentSpace.mockRejectedValue(
          new Error('Agent ID(s) not found: [1-2-3]')
        );
        (
          endpointServiceMock.getInternalFleetServices(undefined, true).fetchAgentsById as jest.Mock
        ).mockResolvedValue([]);

        await expect(getPolicyResponseByAgentId(fetchOptions)).resolves.toEqual(
          expect.objectContaining({ policy_response: expect.anything() })
        );
      });

      it('should throw when the fanned-in agent united document does NOT match the active space', async () => {
        mockPolicyResponseFrom('linked:.ds-metrics-endpoint.policy-default-000001');
        // United index returns no hits: the space filter excluded this agent
        applyEsClientSearchMock({
          esClientMock: readEsClientMock,
          index: METADATA_UNITED_INDEX,
          response: {
            took: 1,
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
          },
        });
        fleetServicesMock.ensureInCurrentSpace.mockRejectedValue(
          new Error('Agent ID(s) not found: [1-2-3]')
        );
        (
          endpointServiceMock.getInternalFleetServices(undefined, true).fetchAgentsById as jest.Mock
        ).mockResolvedValue([]);

        await expect(getPolicyResponseByAgentId(fetchOptions)).rejects.toThrow();
      });

      it('should throw when the fanned-in agent has no united document at all', async () => {
        mockPolicyResponseFrom('linked:.ds-metrics-endpoint.policy-default-000001');
        // No united document exists for this agent — fails closed
        applyEsClientSearchMock({
          esClientMock: readEsClientMock,
          index: METADATA_UNITED_INDEX,
          response: {
            took: 1,
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
          },
        });
        fleetServicesMock.ensureInCurrentSpace.mockRejectedValue(
          new Error('Agent ID(s) not found: [1-2-3]')
        );
        (
          endpointServiceMock.getInternalFleetServices(undefined, true).fetchAgentsById as jest.Mock
        ).mockResolvedValue([]);

        await expect(getPolicyResponseByAgentId(fetchOptions)).rejects.toThrow();
      });

      it('should still hide an origin-local response whose agent is no longer enrolled in Fleet', async () => {
        const spaceError = new Error('Agent ID(s) not found: [1-2-3]');

        fleetServicesMock.ensureInCurrentSpace.mockRejectedValue(spaceError);
        (
          endpointServiceMock.getInternalFleetServices(undefined, true).fetchAgentsById as jest.Mock
        ).mockResolvedValue([]);

        await expect(getPolicyResponseByAgentId(fetchOptions)).rejects.toThrow(spaceError);
      });

      it('should still hide an agent that is enrolled in this project but in another space', async () => {
        const spaceError = new Error('Agent ID(s) not found: [1-2-3]');

        mockPolicyResponseFrom('linked:.ds-metrics-endpoint.policy-default-000001');
        fleetServicesMock.ensureInCurrentSpace.mockRejectedValue(spaceError);
        (
          endpointServiceMock.getInternalFleetServices(undefined, true).fetchAgentsById as jest.Mock
        ).mockResolvedValue([new FleetAgentGenerator('seed').generate({ id: '1-2-3' })]);

        await expect(getPolicyResponseByAgentId(fetchOptions)).rejects.toThrow(spaceError);
      });

      it('should throw when the active space does not exist on this project, even if the united document would have matched', async () => {
        mockPolicyResponseFrom('linked:.ds-metrics-endpoint.policy-default-000001');
        // The united-index check would match — but the space check must fire first
        applyEsClientSearchMock({
          esClientMock: readEsClientMock,
          index: METADATA_UNITED_INDEX,
          response: {
            took: 1,
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: {
              total: { value: 1, relation: 'eq' },
              max_score: 1.0,
              hits: [
                {
                  _index: METADATA_UNITED_INDEX,
                  _id: '1-2-3',
                  _score: 1.0,
                  fields: { 'united.endpoint.agent.id': ['1-2-3'] },
                },
              ],
            },
          },
        });
        fleetServicesMock.ensureInCurrentSpace.mockRejectedValue(
          new Error('Agent ID(s) not found: [1-2-3]')
        );
        (
          endpointServiceMock.getInternalFleetServices(undefined, true).fetchAgentsById as jest.Mock
        ).mockResolvedValue([]);

        // Build a scoped object where getSpace rejects — the space does not exist on this project
        const scoped = await endpointServiceMock.asScoped(request);
        const scopedWithInvalidSpace = {
          ...scoped,
          getSpace: () => Promise.reject(new Error('Saved object [space/only-there] not found')),
        };
        fetchOptions.scoped = scopedWithInvalidSpace;

        await expect(getPolicyResponseByAgentId(fetchOptions)).rejects.toThrow();
      });
    });
  });
});
