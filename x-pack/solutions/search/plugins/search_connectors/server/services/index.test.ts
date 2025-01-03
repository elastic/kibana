/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  ElasticsearchClientMock,
  elasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import {
  AgentlessConnectorsInfraService,
  ConnectorMetadata,
  PackagePolicyMetadata,
  getConnectorsWithoutPolicies,
  getPoliciesWithoutConnectors,
} from '.';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { MockedLogger, loggerMock } from '@kbn/logging-mocks';
import {
  createPackagePolicyServiceMock,
  createMockAgentPolicyService,
} from '@kbn/fleet-plugin/server/mocks';
import { AgentPolicyServiceInterface, PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { AgentPolicy, PackagePolicy, PackagePolicyInput } from '@kbn/fleet-plugin/common';
import { createAgentPolicyMock, createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';

jest.mock('@kbn/fleet-plugin/server/services/epm/packages', () => {
  const mockedGetPackageInfo = ({ pkgName }: { pkgName: string }) => {
    if (pkgName === 'elastic_connectors') {
      const pkg = {
        version: '0.0.5',
        policy_templates: [
          {
            name: 'github_elastic_connectors',
            inputs: [
              {
                type: 'connectors-py',
                vars: [
                  {
                    name: 'connector_id',
                    required: false,
                    type: 'string',
                  },
                  {
                    name: 'connector_name',
                    required: false,
                    type: 'string',
                  },
                  {
                    name: 'service_type',
                    required: false,
                    type: 'string',
                  },
                ],
              },
            ],
          },
        ],
      };

      return Promise.resolve(pkg);
    }
  };
  return {
    getPackageInfo: jest.fn().mockImplementation(mockedGetPackageInfo),
  };
});

describe('AgentlessConnectorsInfraService', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: ElasticsearchClientMock;
  let packagePolicyService: jest.Mocked<PackagePolicyClient>;
  let agentPolicyInterface: jest.Mocked<AgentPolicyServiceInterface>;
  let logger: MockedLogger;
  let service: AgentlessConnectorsInfraService;

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    packagePolicyService = createPackagePolicyServiceMock();
    agentPolicyInterface = createMockAgentPolicyService();
    logger = loggerMock.create();

    service = new AgentlessConnectorsInfraService(
      soClient,
      esClient,
      packagePolicyService,
      agentPolicyInterface,
      logger
    );

    jest.clearAllMocks();
  });

  describe('getNativeConnectors', () => {
    test('Lists only native connectors', async () => {
      const mockResult = {
        results: [
          {
            id: '00000001',
            name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
            is_native: false,
          },
          {
            id: '00000002',
            name: 'Github Connector for ACME Organisation',
            service_type: 'github',
            is_native: true,
          },
        ],
        count: 2,
      };
      esClient.transport.request.mockResolvedValue(mockResult);

      const nativeConnectors = await service.getNativeConnectors();
      expect(nativeConnectors.length).toBe(1);
      expect(nativeConnectors[0].id).toBe(mockResult.results[1].id);
      expect(nativeConnectors[0].name).toBe(mockResult.results[1].name);
      expect(nativeConnectors[0].service_type).toBe(mockResult.results[1].service_type);
    });

    test('Lists only supported service types', async () => {
      const mockResult = {
        results: [
          {
            id: '00000001',
            name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
            is_native: true,
          },
          {
            id: '00000002',
            name: 'Github Connector for ACME Organisation',
            service_type: 'github',
            is_native: true,
          },
          {
            id: '00000003',
            name: 'Connector with unexpected service_type',
            service_type: 'crawler',
            is_native: true,
          },
          {
            id: '00000004',
            name: 'Connector with no service_type',
            service_type: null,
            is_native: true,
          },
        ],
        count: 4,
      };
      esClient.transport.request.mockResolvedValue(mockResult);

      const nativeConnectors = await service.getNativeConnectors();
      expect(nativeConnectors.length).toBe(2);
      expect(nativeConnectors[0].id).toBe(mockResult.results[0].id);
      expect(nativeConnectors[0].name).toBe(mockResult.results[0].name);
      expect(nativeConnectors[0].service_type).toBe(mockResult.results[0].service_type);
      expect(nativeConnectors[1].id).toBe(mockResult.results[1].id);
      expect(nativeConnectors[1].name).toBe(mockResult.results[1].name);
      expect(nativeConnectors[1].service_type).toBe(mockResult.results[1].service_type);
    });
  });
  describe('getConnectorPackagePolicies', () => {
    const getMockPolicyFetchAllItems = (pages: PackagePolicy[][]) => {
      return {
        async *[Symbol.asyncIterator]() {
          for (const page of pages) {
            yield page;
          }
        },
      } as AsyncIterable<PackagePolicy[]>;
    };

    test('Lists only policies with expected input', async () => {
      const firstPackagePolicy = createPackagePolicyMock();
      firstPackagePolicy.id = 'this-is-package-policy-id';
      firstPackagePolicy.policy_ids = ['this-is-agent-policy-id'];
      firstPackagePolicy.supports_agentless = true;
      firstPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
          },
        } as PackagePolicyInput,
      ];
      const secondPackagePolicy = createPackagePolicyMock();
      secondPackagePolicy.supports_agentless = true;
      const thirdPackagePolicy = createPackagePolicyMock();
      thirdPackagePolicy.supports_agentless = true;
      thirdPackagePolicy.inputs = [
        {
          type: 'something-unsupported',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
          },
        } as PackagePolicyInput,
      ];

      packagePolicyService.fetchAllItems.mockResolvedValue(
        getMockPolicyFetchAllItems([[firstPackagePolicy, secondPackagePolicy, thirdPackagePolicy]])
      );

      const policies = await service.getConnectorPackagePolicies();

      expect(policies.length).toBe(1);
      expect(policies[0].package_policy_id).toBe(firstPackagePolicy.id);
      expect(policies[0].connector_metadata.id).toBe(
        firstPackagePolicy.inputs[0].compiled_input.connector_id
      );
      expect(policies[0].connector_metadata.name).toBe(
        firstPackagePolicy.inputs[0].compiled_input.connector_name
      );
      expect(policies[0].connector_metadata.service_type).toBe(
        firstPackagePolicy.inputs[0].compiled_input.service_type
      );
      expect(policies[0].agent_policy_ids).toBe(firstPackagePolicy.policy_ids);
    });

    test('Lists policies if they are returned over multiple pages', async () => {
      const firstPackagePolicy = createPackagePolicyMock();
      firstPackagePolicy.id = 'this-is-package-policy-id';
      firstPackagePolicy.policy_ids = ['this-is-agent-policy-id'];
      firstPackagePolicy.supports_agentless = true;
      firstPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
          },
        } as PackagePolicyInput,
      ];
      const secondPackagePolicy = createPackagePolicyMock();
      secondPackagePolicy.supports_agentless = true;
      const thirdPackagePolicy = createPackagePolicyMock();
      thirdPackagePolicy.supports_agentless = true;
      thirdPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000003',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'github',
          },
        } as PackagePolicyInput,
      ];

      packagePolicyService.fetchAllItems.mockResolvedValue(
        getMockPolicyFetchAllItems([
          [firstPackagePolicy],
          [secondPackagePolicy],
          [thirdPackagePolicy],
        ])
      );

      const policies = await service.getConnectorPackagePolicies();

      expect(policies.length).toBe(2);
      expect(policies[0].package_policy_id).toBe(firstPackagePolicy.id);
      expect(policies[0].connector_metadata.id).toBe(
        firstPackagePolicy.inputs[0].compiled_input.connector_id
      );
      expect(policies[0].connector_metadata.name).toBe(
        firstPackagePolicy.inputs[0].compiled_input.connector_name
      );
      expect(policies[0].connector_metadata.service_type).toBe(
        firstPackagePolicy.inputs[0].compiled_input.service_type
      );
      expect(policies[0].agent_policy_ids).toBe(firstPackagePolicy.policy_ids);

      expect(policies[1].package_policy_id).toBe(thirdPackagePolicy.id);
      expect(policies[1].connector_metadata.id).toBe(
        thirdPackagePolicy.inputs[0].compiled_input.connector_id
      );
      expect(policies[1].connector_metadata.name).toBe(
        thirdPackagePolicy.inputs[0].compiled_input.connector_name
      );
      expect(policies[1].connector_metadata.service_type).toBe(
        thirdPackagePolicy.inputs[0].compiled_input.service_type
      );
      expect(policies[1].agent_policy_ids).toBe(thirdPackagePolicy.policy_ids);
    });

    test('Skips policies that have missing fields', async () => {
      const firstPackagePolicy = createPackagePolicyMock();
      firstPackagePolicy.id = 'this-is-package-policy-id';
      firstPackagePolicy.policy_ids = ['this-is-agent-policy-id'];
      firstPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
          },
        } as PackagePolicyInput,
      ];
      const secondPackagePolicy = createPackagePolicyMock();
      secondPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'github',
          },
        } as PackagePolicyInput,
      ];

      packagePolicyService.fetchAllItems.mockResolvedValue(
        getMockPolicyFetchAllItems([[firstPackagePolicy], [secondPackagePolicy]])
      );

      const policies = await service.getConnectorPackagePolicies();

      expect(policies.length).toBe(0);
    });
  });
  describe('deployConnector', () => {
    let agentPolicy: AgentPolicy;
    let sharepointOnlinePackagePolicy: PackagePolicy;

    beforeAll(() => {
      agentPolicy = createAgentPolicyMock();

      sharepointOnlinePackagePolicy = createPackagePolicyMock();
      sharepointOnlinePackagePolicy.id = 'this-is-package-policy-id';
      sharepointOnlinePackagePolicy.policy_ids = ['this-is-agent-policy-id'];
      sharepointOnlinePackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
          },
        } as PackagePolicyInput,
      ];
    });

    test('Raises an error if connector.id is missing', async () => {
      const connector = {
        id: '',
        name: 'something',
        service_type: 'github',
      };

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('Connector id');
      }
    });

    test('Raises an error if connector.service_type is missing', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: '',
      };

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('service_type');
      }
    });

    test('Raises an error if connector.service_type is unsupported', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: 'crawler',
      };

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('service_type');
        expect(e.message).toContain('incompatible');
      }
    });

    test('Does not swallow an error if agent policy creation failed', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: 'github',
      };
      const errorMessage = 'Failed to create an agent policy hehe';

      agentPolicyInterface.create.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toEqual(errorMessage);
      }
    });

    test('Does not swallow an error if package policy creation failed', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: 'github',
      };
      const errorMessage = 'Failed to create a package policy hehe';

      agentPolicyInterface.create.mockResolvedValue(agentPolicy);
      packagePolicyService.create.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toEqual(errorMessage);
      }
    });

    test('Returns a created package policy when all goes well', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: 'github',
      };

      agentPolicyInterface.create.mockResolvedValue(agentPolicy);
      packagePolicyService.create.mockResolvedValue(sharepointOnlinePackagePolicy);

      const result = await service.deployConnector(connector);
      expect(result).toBe(sharepointOnlinePackagePolicy);
    });
  });
  describe('removeDeployment', () => {
    const packagePolicyId = 'this-is-package-policy-id';
    const agentPolicyId = 'this-is-agent-policy-id';
    let sharepointOnlinePackagePolicy: PackagePolicy;

    beforeAll(() => {
      sharepointOnlinePackagePolicy = createPackagePolicyMock();
      sharepointOnlinePackagePolicy.id = packagePolicyId;
      sharepointOnlinePackagePolicy.policy_ids = [agentPolicyId];
      sharepointOnlinePackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
          },
        } as PackagePolicyInput,
      ];
    });

    test('Calls for deletion of both agent policy and package policy', async () => {
      packagePolicyService.get.mockResolvedValue(sharepointOnlinePackagePolicy);

      await service.removeDeployment(packagePolicyId);

      expect(agentPolicyInterface.delete).toBeCalledWith(soClient, esClient, agentPolicyId);
      expect(packagePolicyService.delete).toBeCalledWith(soClient, esClient, [packagePolicyId]);
    });

    test('Raises an error if deletion of agent policy failed', async () => {
      packagePolicyService.get.mockResolvedValue(sharepointOnlinePackagePolicy);

      const errorMessage = 'Failed to create a package policy hehe';

      agentPolicyInterface.delete.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      try {
        await service.removeDeployment(packagePolicyId);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toEqual(errorMessage);
      }
    });

    test('Raises an error if deletion of package policy failed', async () => {
      packagePolicyService.get.mockResolvedValue(sharepointOnlinePackagePolicy);

      const errorMessage = 'Failed to create a package policy hehe';

      packagePolicyService.delete.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      try {
        await service.removeDeployment(packagePolicyId);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toEqual(errorMessage);
      }
    });

    test('Raises an error if a policy is not found', async () => {
      packagePolicyService.get.mockResolvedValue(null);

      try {
        await service.removeDeployment(packagePolicyId);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('Failed to delete policy');
        expect(e.message).toContain(packagePolicyId);
      }
    });
  });
});

describe('module', () => {
  const githubConnector: ConnectorMetadata = {
    id: '000001',
    name: 'Github Connector',
    service_type: 'github',
  };

  const sharepointConnector: ConnectorMetadata = {
    id: '000002',
    name: 'Sharepoint Connector',
    service_type: 'sharepoint_online',
  };

  const mysqlConnector: ConnectorMetadata = {
    id: '000003',
    name: 'MySQL Connector',
    service_type: 'mysql',
  };

  const githubPackagePolicy: PackagePolicyMetadata = {
    package_policy_id: 'agent-001',
    agent_policy_ids: ['agent-package-001'],
    connector_metadata: githubConnector,
  };

  const sharepointPackagePolicy: PackagePolicyMetadata = {
    package_policy_id: 'agent-002',
    agent_policy_ids: ['agent-package-002'],
    connector_metadata: sharepointConnector,
  };

  const mysqlPackagePolicy: PackagePolicyMetadata = {
    package_policy_id: 'agent-003',
    agent_policy_ids: ['agent-package-003'],
    connector_metadata: mysqlConnector,
  };

  describe('getPoliciesWithoutConnectors', () => {
    test('Returns a missing policy if one is missing', async () => {
      const missingPolicies = getPoliciesWithoutConnectors(
        [githubPackagePolicy, sharepointPackagePolicy, mysqlPackagePolicy],
        [githubConnector, sharepointConnector]
      );

      expect(missingPolicies.length).toBe(1);
      expect(missingPolicies).toContain(mysqlPackagePolicy);
    });

    test('Returns empty array if no policies are missing', async () => {
      const missingPolicies = getPoliciesWithoutConnectors(
        [githubPackagePolicy, sharepointPackagePolicy, mysqlPackagePolicy],
        [githubConnector, sharepointConnector, mysqlConnector]
      );

      expect(missingPolicies.length).toBe(0);
    });

    test('Returns all policies if all are missing', async () => {
      const missingPolicies = getPoliciesWithoutConnectors(
        [githubPackagePolicy, sharepointPackagePolicy, mysqlPackagePolicy],
        []
      );

      expect(missingPolicies.length).toBe(3);
      expect(missingPolicies).toContain(githubPackagePolicy);
      expect(missingPolicies).toContain(sharepointPackagePolicy);
      expect(missingPolicies).toContain(mysqlPackagePolicy);
    });
  });

  describe('getConnectorsWithoutPolicies', () => {
    test('Returns a missing policy if one is missing', async () => {
      const missingConnectors = getConnectorsWithoutPolicies(
        [githubPackagePolicy, sharepointPackagePolicy],
        [githubConnector, sharepointConnector, mysqlConnector]
      );

      expect(missingConnectors.length).toBe(1);
      expect(missingConnectors).toContain(mysqlConnector);
    });

    test('Returns empty array if no policies are missing', async () => {
      const missingConnectors = getConnectorsWithoutPolicies(
        [githubPackagePolicy, sharepointPackagePolicy, mysqlPackagePolicy],
        [githubConnector, sharepointConnector, mysqlConnector]
      );

      expect(missingConnectors.length).toBe(0);
    });

    test('Returns all policies if all are missing', async () => {
      const missingConnectors = getConnectorsWithoutPolicies(
        [],
        [githubConnector, sharepointConnector, mysqlConnector]
      );

      expect(missingConnectors.length).toBe(3);
      expect(missingConnectors).toContain(githubConnector);
      expect(missingConnectors).toContain(sharepointConnector);
      expect(missingConnectors).toContain(mysqlConnector);
    });
  });
});
