/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import type { EndpointMetadataServiceTestContextMock } from './mocks';
import { createEndpointMetadataServiceTestContextMock } from './mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  legacyMetadataSearchResponseMock,
  unitedMetadataSearchResponseMock,
} from '../../routes/metadata/support/test_support';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import {
  buildUnitedIndexQuery,
  getESQueryHostMetadataByFleetAgentIds,
  getESQueryHostMetadataByID,
  getESQueryHostMetadataByIDs,
} from '../../routes/metadata/query_builders';
import type { HostMetadata } from '../../../../common/endpoint/types';
import type { Agent, PackagePolicy } from '@kbn/fleet-plugin/common';
import { FleetAgentGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_generator';
import type { AgentPolicyServiceInterface } from '@kbn/fleet-plugin/server/services';
import { createAppContextStartContractMock as fleetCreateAppContextStartContractMock } from '@kbn/fleet-plugin/server/mocks';
import { appContextService as fleetAppContextService } from '@kbn/fleet-plugin/server/services';
import { EndpointError } from '../../../../common/endpoint/errors';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { removeVersionSuffixFromPolicyId } from '@kbn/fleet-plugin/common/services/version_specific_policies_utils';
import { METADATA_UNITED_INDEX } from '../../../../common/endpoint/constants';
import { applyEsClientSearchMock } from '../../mocks/utils.mock';

describe('EndpointMetadataService', () => {
  let testMockedContext: EndpointMetadataServiceTestContextMock;
  let metadataService: EndpointMetadataServiceTestContextMock['endpointMetadataService'];
  let esClient: ElasticsearchClientMock;
  let soClient: SavedObjectsClientContract;
  let endpointDocGenerator: EndpointDocGenerator;

  beforeEach(() => {
    endpointDocGenerator = new EndpointDocGenerator('seed');
    testMockedContext = createEndpointMetadataServiceTestContextMock();
    metadataService = testMockedContext.endpointMetadataService;
    esClient = testMockedContext.esClient;
    soClient = savedObjectsClientMock.create();
    soClient.find = jest.fn().mockResolvedValue({ saved_objects: [] });
    fleetAppContextService.start(
      fleetCreateAppContextStartContractMock({}, false, {
        withoutSpaceExtensions: soClient,
      })
    );
  });

  describe('#findHostMetadataForFleetAgents()', () => {
    let fleetAgentIds: string[];
    let endpointMetadataDoc: HostMetadata;

    beforeEach(() => {
      fleetAgentIds = ['one', 'two'];
      endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
      esClient.search.mockResponse(legacyMetadataSearchResponseMock(endpointMetadataDoc));
    });

    it('should call elasticsearch with proper filter', async () => {
      await metadataService.findHostMetadataForFleetAgents(fleetAgentIds);
      expect(esClient.search).toHaveBeenCalledWith(
        { ...getESQueryHostMetadataByFleetAgentIds(fleetAgentIds), size: fleetAgentIds.length },
        { ignore: [404] }
      );
    });

    it('should query the CCS-prefixed index when CCS is enabled', async () => {
      testMockedContext.endpointAppContextService.isCcsEnabled.mockResolvedValue(true);
      await metadataService.findHostMetadataForFleetAgents(fleetAgentIds);
      expect(esClient.search).toHaveBeenCalledWith(
        {
          ...getESQueryHostMetadataByFleetAgentIds(fleetAgentIds, true),
          size: fleetAgentIds.length,
        },
        { ignore: [404] }
      );
    });

    it('should throw a wrapped elasticsearch Error when one occurs', async () => {
      esClient.search.mockRejectedValue(new Error('foo bar'));
      await expect(metadataService.findHostMetadataForFleetAgents(fleetAgentIds)).rejects.toThrow(
        EndpointError
      );
    });

    it('should return an array of Host Metadata documents', async () => {
      const response = await metadataService.findHostMetadataForFleetAgents(fleetAgentIds);
      expect(response).toEqual([endpointMetadataDoc]);
    });

    it('should validate agent is visible in current space', async () => {
      const data = testMockedContext.applyMetadataMocks(
        testMockedContext.esClient,
        testMockedContext.fleetServices
      );
      await metadataService.findHostMetadataForFleetAgents([data.unitedMetadata.agent.id]);

      expect(testMockedContext.fleetServices.ensureInCurrentSpace).toHaveBeenCalledWith({
        agentIds: [data.unitedMetadata.agent.id],
      });
    });
  });

  describe('#getHostMetadataList', () => {
    let agentPolicyServiceMock: jest.Mocked<AgentPolicyServiceInterface>;

    beforeEach(() => {
      agentPolicyServiceMock = testMockedContext.agentPolicyService;
    });

    it('should throw wrapped error if es error', async () => {
      esClient.search.mockRejectedValue({});
      const metadataListResponse = metadataService.getHostMetadataList({
        page: 0,
        pageSize: 10,
        kuery: '',
        hostStatuses: [],
      });
      await expect(metadataListResponse).rejects.toThrow(EndpointError);
    });

    it('should not throw if index not found', async () => {
      esClient.search.mockRejectedValue({
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      });
      const metadataListResponse = await metadataService.getHostMetadataList({
        page: 0,
        pageSize: 10,
        kuery: '',
        hostStatuses: [],
      });

      expect(metadataListResponse).toEqual({
        data: [],
        total: 0,
      });
    });

    it('should query the CCS-prefixed index when CCS is enabled', async () => {
      esClient.search.mockRejectedValue({
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      });
      testMockedContext.endpointAppContextService.isCcsEnabled.mockResolvedValue(true);

      const queryOptions = { page: 0, pageSize: 10, kuery: '', hostStatuses: [] };
      await metadataService.getHostMetadataList(queryOptions);

      const expectedQuery = await buildUnitedIndexQuery(soClient, queryOptions, [], true);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: expectedQuery.index })
      );
    });

    it('should correctly list HostMetadata', async () => {
      const policyId = 'test-agent-policy-id';
      const packagePolicies = [
        Object.assign(endpointDocGenerator.generatePolicyPackagePolicy(), {
          id: 'test-package-policy-id',
          policy_ids: [policyId],
          revision: 1,
        }),
      ];
      const packagePolicyIds = uniq(packagePolicies.flatMap((policy) => policy.policy_ids));
      const agentPolicies = [
        Object.assign(endpointDocGenerator.generateAgentPolicy(), {
          id: policyId,
          revision: 2,
          package_policies: packagePolicies,
        }),
      ];

      const newDate = new Date();
      const agentPolicyIds = agentPolicies.map((policy) => policy.id);
      const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata(newDate.getTime());
      const mockAgent = {
        policy_id: agentPolicies[0].id,
        policy_revision: agentPolicies[0].revision,
        last_checkin: newDate.toISOString(),
      } as unknown as Agent;
      const mockDoc = unitedMetadataSearchResponseMock(endpointMetadataDoc, mockAgent);
      esClient.search.mockResponse(mockDoc);
      agentPolicyServiceMock.getByIds.mockResolvedValue(agentPolicies);
      testMockedContext.packagePolicyService.list.mockImplementation(async (_, { page }) => {
        const response = {
          items: packagePolicies,
          page: page ?? 1,
          total: packagePolicies.length,
          perPage: packagePolicies.length,
        };

        if ((page ?? 1) > 1) {
          response.items = [];
        }

        return response;
      });

      const queryOptions = { page: 1, pageSize: 10, kuery: '', hostStatuses: [] };
      const metadataListResponse = await metadataService.getHostMetadataList(queryOptions);
      const unitedIndexQuery = await buildUnitedIndexQuery(
        soClient,
        queryOptions,
        packagePolicyIds
      );

      expect(unitedIndexQuery.runtime_mappings?.status).toBeDefined();
      // @ts-expect-error runtime_mappings is not typed
      unitedIndexQuery.runtime_mappings.status.script.source = expect.any(String);

      expect(esClient.search).toHaveBeenCalledWith(unitedIndexQuery);
      expect(agentPolicyServiceMock.getByIds).toHaveBeenCalledWith(
        expect.anything(),
        agentPolicyIds
      );
      expect(metadataListResponse).toEqual({
        data: [
          {
            metadata: endpointMetadataDoc,
            host_status: 'healthy',
            policy_info: {
              agent: {
                applied: {
                  id: mockAgent.policy_id,
                  revision: mockAgent.policy_revision,
                },
                configured: {
                  id: agentPolicies[0].id,
                  revision: agentPolicies[0].revision,
                },
              },
              endpoint: {
                id: packagePolicies[0].id,
                revision: packagePolicies[0].revision,
              },
            },
            last_checkin: newDate.toISOString(),
          },
        ],
        total: 1,
      });
    });
  });

  describe('#getHostMetadataList - policy_id suffix stripping', () => {
    let agentPolicyServiceMock: jest.Mocked<AgentPolicyServiceInterface>;
    let queryOptions: Parameters<typeof metadataService.getHostMetadataList>[0];

    beforeEach(() => {
      agentPolicyServiceMock = testMockedContext.agentPolicyService;
      queryOptions = { page: 0, pageSize: 10, kuery: '', hostStatuses: [] };
    });

    /**
     * Sets up the ES search + fleet mocks for a single united metadata hit whose
     * `united.agent.policy_id` is set to `agentPolicyId`. Returns the base (expected/stripped)
     * policy id along with the generated fleet data.
     */
    const setupSingleHit = (agentPolicyId: string) => {
      const basePolicyId = removeVersionSuffixFromPolicyId(agentPolicyId);
      const packagePolicies = [
        Object.assign(endpointDocGenerator.generatePolicyPackagePolicy(), {
          id: 'test-package-policy-id',
          policy_ids: [basePolicyId],
          revision: 1,
        }),
      ];
      const agentPolicies = [
        Object.assign(endpointDocGenerator.generateAgentPolicy(), {
          id: basePolicyId,
          revision: 2,
          package_policies: packagePolicies,
        }),
      ];

      const newDate = new Date();
      const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata(newDate.getTime());
      const mockAgent = {
        agent: { id: 'test-agent-id' },
        policy_id: agentPolicyId,
        policy_revision: agentPolicies[0].revision,
        last_checkin: newDate.toISOString(),
      } as unknown as Agent;

      esClient.search.mockResponse(
        unitedMetadataSearchResponseMock(endpointMetadataDoc, mockAgent)
      );
      agentPolicyServiceMock.getByIds.mockResolvedValue(agentPolicies);
      testMockedContext.packagePolicyService.list.mockImplementation(async (_, { page }) => ({
        items: (page ?? 1) > 1 ? [] : packagePolicies,
        page: page ?? 1,
        total: packagePolicies.length,
        perPage: packagePolicies.length,
      }));

      return { basePolicyId, agentPolicies, packagePolicies };
    };

    it('should strip the "#..." suffix from `policy_id` before looking up agent policies', async () => {
      const { basePolicyId } = setupSingleHit('test-agent-policy-id#9.2');

      await metadataService.getHostMetadataList(queryOptions);

      expect(agentPolicyServiceMock.getByIds).toHaveBeenCalledWith(expect.anything(), [
        basePolicyId,
      ]);
    });

    it('should return the stripped `policy_id` in the applied agent policy info.', async () => {
      const { basePolicyId } = setupSingleHit('test-agent-policy-id#9.5');

      const response = await metadataService.getHostMetadataList(queryOptions);

      expect(response.data[0].policy_info?.agent.applied.id).toEqual(basePolicyId);
    });

    it('should not alter a `policy_id` that has no "#..." suffix', async () => {
      const policyId = 'test-agent-policy-id';
      setupSingleHit(policyId);

      const response = await metadataService.getHostMetadataList(queryOptions);

      expect(agentPolicyServiceMock.getByIds).toHaveBeenCalledWith(expect.anything(), [policyId]);
      expect(response.data[0].policy_info?.agent.applied.id).toEqual(policyId);
    });

    it('should strip only the suffix and keep the base policy id intact', async () => {
      const { basePolicyId } = setupSingleHit('test-agent-policy-id#blah#9.5');

      await metadataService.getHostMetadataList(queryOptions);

      expect(basePolicyId).toEqual('test-agent-policy-id#blah');
      expect(agentPolicyServiceMock.getByIds).toHaveBeenCalledWith(expect.anything(), [
        basePolicyId,
      ]);
    });
  });

  describe('#getAllEndpointPackagePolicies', () => {
    it('gets all endpoint package policies', async () => {
      const mockPolicy: PackagePolicy = {
        id: '1',
        policy_id: 'test-id-1',
      } as PackagePolicy;
      const mockPackagePolicyService = testMockedContext.packagePolicyService;
      mockPackagePolicyService.list.mockResolvedValueOnce({
        items: [mockPolicy],
        total: 1,
        perPage: 10,
        page: 1,
      });

      const endpointPackagePolicies = await metadataService.getAllEndpointPackagePolicies();
      const expected: PackagePolicy[] = [mockPolicy];
      expect(endpointPackagePolicies).toEqual(expected);
    });
  });

  describe('#getHostMetadata()', () => {
    it('should validate agent is visible in current space', async () => {
      const data = testMockedContext.applyMetadataMocks(
        testMockedContext.esClient,
        testMockedContext.fleetServices
      );
      await metadataService.getHostMetadata(data.unitedMetadata.agent.id);

      expect(testMockedContext.fleetServices.ensureInCurrentSpace).toHaveBeenCalledWith({
        agentIds: [data.unitedMetadata.agent.id],
      });
    });

    it('should query the CCS-prefixed index when CCS is enabled', async () => {
      const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
      esClient.search.mockResponse(legacyMetadataSearchResponseMock(endpointMetadataDoc));
      testMockedContext.endpointAppContextService.isCcsEnabled.mockResolvedValue(true);

      await metadataService.getHostMetadata(endpointMetadataDoc.agent.id);

      const expectedQuery = getESQueryHostMetadataByID(endpointMetadataDoc.agent.id, true);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: expectedQuery.index })
      );
    });
  });

  describe('and CPS is enabled', () => {
    let readEsClientMock: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
    let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

    beforeEach(() => {
      readEsClientMock = elasticsearchServiceMock.createElasticsearchClient();
      request = httpServerMock.createKibanaRequest();
      testMockedContext.endpointAppContextService.isCpsActive.mockResolvedValue(true);
      testMockedContext.endpointAppContextService.getReadEsClient.mockResolvedValue(
        readEsClientMock
      );
      // Default: empty search results so tests that only care about client routing don't throw
      readEsClientMock.search.mockResolvedValue({
        took: 0,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { hits: [], total: { value: 0, relation: 'eq' }, max_score: null },
      } as unknown as Awaited<ReturnType<typeof readEsClientMock.search>>);
    });

    describe('#getHostMetadataList', () => {
      it('should read as the request user so the list can fan out to linked projects', async () => {
        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        await metadataService.getHostMetadataList(
          { page: 0, pageSize: 10, kuery: '', hostStatuses: [] },
          scoped
        );

        expect(testMockedContext.endpointAppContextService.getReadEsClient).toHaveBeenCalledWith(
          request
        );
        expect(readEsClientMock.search).toHaveBeenCalled();
        expect(esClient.search).not.toHaveBeenCalled();
      });

      it('should fall back to the internal client when no request is available, even with CPS on (flag-off twin)', async () => {
        esClient.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { hits: [], total: { value: 0, relation: 'eq' }, max_score: null },
        } as unknown as Awaited<ReturnType<typeof esClient.search>>);

        await metadataService.getHostMetadataList({
          page: 0,
          pageSize: 10,
          kuery: '',
          hostStatuses: [],
        });

        expect(esClient.search).toHaveBeenCalled();
        expect(readEsClientMock.search).not.toHaveBeenCalled();
      });

      it('should pass `ignoreMissing: true` to `agentPolicy.getByIds` so missing linked-project policies do not throw', async () => {
        testMockedContext.fleetServices.agentPolicy.getByIds.mockResolvedValue([]);

        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        await metadataService.getHostMetadataList(
          { page: 0, pageSize: 10, kuery: '', hostStatuses: [] },
          scoped
        );

        expect(testMockedContext.fleetServices.agentPolicy.getByIds).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ ignoreMissing: true })
        );
      });

      it('should leave the origin-only policy lookup exactly as it was when CPS is off', async () => {
        testMockedContext.endpointAppContextService.isCpsActive.mockResolvedValue(false);
        esClient.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { hits: [], total: { value: 0, relation: 'eq' }, max_score: null },
        } as unknown as Awaited<ReturnType<typeof esClient.search>>);
        testMockedContext.fleetServices.agentPolicy.getByIds.mockResolvedValue([]);

        await metadataService.getHostMetadataList({
          page: 0,
          pageSize: 10,
          kuery: '',
          hostStatuses: [],
        });

        expect(testMockedContext.fleetServices.agentPolicy.getByIds).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything()
        );
      });

      it('should still return rows when a linked-project agent has no matching policy in the local project', async () => {
        const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
        const mockAgent = {
          policy_id: 'unknown-linked-policy-id',
        } as unknown as Agent;
        readEsClientMock.search.mockResolvedValue(
          unitedMetadataSearchResponseMock(endpointMetadataDoc, mockAgent) as unknown as Awaited<
            ReturnType<typeof readEsClientMock.search>
          >
        );
        testMockedContext.fleetServices.agentPolicy.getByIds.mockResolvedValue([]);
        // policy.get returns null → getFleetAgentPolicy throws FleetAgentPolicyNotFoundError,
        // which enrichHostMetadata catches and logs — the row is still produced
        testMockedContext.fleetServices.agentPolicy.get.mockResolvedValue(null);

        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        const result = await metadataService.getHostMetadataList(
          { page: 0, pageSize: 10, kuery: '', hostStatuses: [] },
          scoped
        );

        expect(result.data).toHaveLength(1);
      });
    });

    describe('#getHostMetadata()', () => {
      it('should reject when the agent is not visible in the space and the hit came from a local index', async () => {
        const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
        // Hit's _index has no colon → classified as local by isFannedInHit
        readEsClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: null,
            hits: [
              {
                _index: 'metrics-endpoint.metadata-default',
                _id: 'local-hit-id',
                _score: null,
                _source: endpointMetadataDoc,
                sort: [0],
              },
            ],
          },
        } as unknown as Awaited<ReturnType<typeof readEsClientMock.search>>);
        testMockedContext.fleetServices.ensureInCurrentSpace.mockRejectedValue(
          new Error('agent is not visible in this space')
        );

        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        await expect(
          metadataService.getHostMetadata(endpointMetadataDoc.agent.id, scoped)
        ).rejects.toThrow();
      });

      it('should resolve when the space check fails but the hit came from a linked project and the agent is not enrolled locally', async () => {
        const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
        // Hit's _index has a colon → classified as fanned-in by isFannedInHit
        readEsClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: null,
            hits: [
              {
                _index: 'remote-project:metrics-endpoint.metadata-default',
                _id: 'fanned-in-hit-id',
                _score: null,
                _source: endpointMetadataDoc,
                sort: [0],
              },
            ],
          },
        } as unknown as Awaited<ReturnType<typeof readEsClientMock.search>>);
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
                  _id: endpointMetadataDoc.agent.id,
                  _score: 1.0,
                  fields: { 'united.endpoint.agent.id': [endpointMetadataDoc.agent.id] },
                },
              ],
            },
          },
        });
        testMockedContext.fleetServices.ensureInCurrentSpace.mockRejectedValue(
          new Error('agent is not visible in this space')
        );
        // No locally enrolled agent → the document belongs to the linked project
        (testMockedContext.fleetServices.fetchAgentsById as jest.Mock).mockResolvedValue([]);

        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        await expect(
          metadataService.getHostMetadata(endpointMetadataDoc.agent.id, scoped)
        ).resolves.toBeDefined();
      });

      it('should render a fanned-in agent whose united document matches the active space', async () => {
        const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
        readEsClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: null,
            hits: [
              {
                _index: 'remote-project:metrics-endpoint.metadata-default',
                _id: 'fanned-in-hit-id',
                _score: null,
                _source: endpointMetadataDoc,
                sort: [0],
              },
            ],
          },
        } as unknown as Awaited<ReturnType<typeof readEsClientMock.search>>);
        // United index confirms the agent is in the active space
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
                  _id: endpointMetadataDoc.agent.id,
                  _score: 1.0,
                  fields: { 'united.endpoint.agent.id': [endpointMetadataDoc.agent.id] },
                },
              ],
            },
          },
        });
        testMockedContext.fleetServices.ensureInCurrentSpace.mockRejectedValue(
          new Error('agent is not visible in this space')
        );
        (testMockedContext.fleetServices.fetchAgentsById as jest.Mock).mockResolvedValue([]);

        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        await expect(
          metadataService.getHostMetadata(endpointMetadataDoc.agent.id, scoped)
        ).resolves.toBeDefined();
      });

      it('should throw when the fanned-in agent united document does NOT match the active space', async () => {
        const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
        readEsClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: null,
            hits: [
              {
                _index: 'remote-project:metrics-endpoint.metadata-default',
                _id: 'fanned-in-hit-id',
                _score: null,
                _source: endpointMetadataDoc,
                sort: [0],
              },
            ],
          },
        } as unknown as Awaited<ReturnType<typeof readEsClientMock.search>>);
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
        testMockedContext.fleetServices.ensureInCurrentSpace.mockRejectedValue(
          new Error('agent is not visible in this space')
        );
        (testMockedContext.fleetServices.fetchAgentsById as jest.Mock).mockResolvedValue([]);

        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        await expect(
          metadataService.getHostMetadata(endpointMetadataDoc.agent.id, scoped)
        ).rejects.toThrow();
      });

      it('should throw when the fanned-in agent has no united document at all', async () => {
        const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
        readEsClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: null,
            hits: [
              {
                _index: 'remote-project:metrics-endpoint.metadata-default',
                _id: 'fanned-in-hit-id',
                _score: null,
                _source: endpointMetadataDoc,
                sort: [0],
              },
            ],
          },
        } as unknown as Awaited<ReturnType<typeof readEsClientMock.search>>);
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
        testMockedContext.fleetServices.ensureInCurrentSpace.mockRejectedValue(
          new Error('agent is not visible in this space')
        );
        (testMockedContext.fleetServices.fetchAgentsById as jest.Mock).mockResolvedValue([]);

        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        await expect(
          metadataService.getHostMetadata(endpointMetadataDoc.agent.id, scoped)
        ).rejects.toThrow();
      });

      it('should throw when the active space does not exist on this project, even if the united document would have matched', async () => {
        const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
        readEsClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: null,
            hits: [
              {
                _index: 'remote-project:metrics-endpoint.metadata-default',
                _id: 'fanned-in-hit-id',
                _score: null,
                _source: endpointMetadataDoc,
                sort: [0],
              },
            ],
          },
        } as unknown as Awaited<ReturnType<typeof readEsClientMock.search>>);
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
                  _id: endpointMetadataDoc.agent.id,
                  _score: 1.0,
                  fields: { 'united.endpoint.agent.id': [endpointMetadataDoc.agent.id] },
                },
              ],
            },
          },
        });
        testMockedContext.fleetServices.ensureInCurrentSpace.mockRejectedValue(
          new Error('agent is not visible in this space')
        );
        (testMockedContext.fleetServices.fetchAgentsById as jest.Mock).mockResolvedValue([]);

        // Build a scoped object where getSpace rejects — the space does not exist on this project
        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        const scopedWithInvalidSpace = {
          ...scoped,
          getSpace: () => Promise.reject(new Error('Saved object [space/only-there] not found')),
        };

        await expect(
          metadataService.getHostMetadata(endpointMetadataDoc.agent.id, scopedWithInvalidSpace)
        ).rejects.toThrow();
      });

      it('should reject when the space check fails, the hit is from a linked project, but the agent IS enrolled locally', async () => {
        const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
        readEsClientMock.search.mockResolvedValue({
          took: 0,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: null,
            hits: [
              {
                _index: 'remote-project:metrics-endpoint.metadata-default',
                _id: 'fanned-in-hit-id',
                _score: null,
                _source: endpointMetadataDoc,
                sort: [0],
              },
            ],
          },
        } as unknown as Awaited<ReturnType<typeof readEsClientMock.search>>);
        testMockedContext.fleetServices.ensureInCurrentSpace.mockRejectedValue(
          new Error('agent is not visible in this space')
        );
        // A locally enrolled agent proves real space isolation — the error must surface
        const localAgent = new FleetAgentGenerator('seed').generate({
          id: endpointMetadataDoc.agent.id,
        });
        (testMockedContext.fleetServices.fetchAgentsById as jest.Mock).mockResolvedValue([
          localAgent,
        ]);

        const scoped = await testMockedContext.endpointAppContextService.asScoped(request);
        await expect(
          metadataService.getHostMetadata(endpointMetadataDoc.agent.id, scoped)
        ).rejects.toThrow();
      });
    });
  });

  describe('#getMetadataForEndpoints()', () => {
    it('should call Elastic Search with correct `size`', async () => {
      testMockedContext.applyMetadataMocks(
        testMockedContext.esClient,
        testMockedContext.fleetServices
      );
      const agentIds = Array.from({ length: 25 }, () => Math.random().toString(32));

      await metadataService.getMetadataForEndpoints(agentIds);

      expect(testMockedContext.esClient.search).toHaveBeenCalledWith({
        ...getESQueryHostMetadataByIDs(agentIds),
        size: agentIds.length,
      });
    });

    it('should validate agent is visible in current space', async () => {
      const data = testMockedContext.applyMetadataMocks(
        testMockedContext.esClient,
        testMockedContext.fleetServices
      );
      await metadataService.getMetadataForEndpoints([data.unitedMetadata.agent.id]);

      expect(testMockedContext.fleetServices.ensureInCurrentSpace).toHaveBeenCalledWith({
        agentIds: [data.unitedMetadata.agent.id],
      });
    });

    it('should query the CCS-prefixed index when ccsEnabled is true', async () => {
      const data = testMockedContext.applyMetadataMocks(
        testMockedContext.esClient,
        testMockedContext.fleetServices
      );
      testMockedContext.endpointAppContextService.isCcsEnabled.mockResolvedValue(true);
      await metadataService.getMetadataForEndpoints([data.unitedMetadata.agent.id]);

      const expectedQuery = getESQueryHostMetadataByIDs([data.unitedMetadata.agent.id], true);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: expectedQuery.index })
      );
    });
  });
});
