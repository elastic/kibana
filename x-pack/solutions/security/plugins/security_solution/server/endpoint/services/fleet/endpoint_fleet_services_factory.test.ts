/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateEndpointFleetServicesFactoryResponse,
  EndpointInternalFleetServicesInterfaceMocked,
} from './endpoint_fleet_services_factory.mocks';
import { createEndpointFleetServicesFactoryMock } from './endpoint_fleet_services_factory.mocks';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import { NotFoundError } from '../../errors';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { FleetAgentPolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_policy_generator';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';

describe('EndpointServiceFactory', () => {
  let fleetServicesMock: EndpointInternalFleetServicesInterfaceMocked;
  let fleetServicesFactoryMock: CreateEndpointFleetServicesFactoryResponse;

  beforeEach(() => {
    fleetServicesFactoryMock = createEndpointFleetServicesFactoryMock();
    fleetServicesMock = fleetServicesFactoryMock.service.asInternalUser();
  });

  it('should return fleet services when `asInternalUser()` is invoked', () => {
    expect(Object.keys(fleetServicesMock)).toEqual([
      'agent',
      'agentPolicy',
      'packages',
      'packagePolicy',
      'savedObjects',
      'endpointPolicyKuery',
      'ensureInCurrentSpace',
      'getPolicyNamespace',
      'getIntegrationNamespaces',
    ]);
  });

  describe('#ensureInCurentSpace()', () => {
    it('should check agent ids', async () => {
      await expect(
        fleetServicesMock.ensureInCurrentSpace({ agentIds: ['123'] })
      ).resolves.toBeUndefined();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds
      ).toHaveBeenCalledWith(['123']);
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
      ).not.toHaveBeenCalled();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
      ).not.toHaveBeenCalled();
    });

    it('should check integration policy ids', async () => {
      await expect(
        fleetServicesMock.ensureInCurrentSpace({ integrationPolicyIds: ['123'] })
      ).resolves.toBeUndefined();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds
      ).not.toHaveBeenCalled();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
      ).not.toHaveBeenCalled();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
      ).toHaveBeenCalledWith(expect.anything(), ['123']);
    });

    it('should check agent policy ids', async () => {
      await expect(
        fleetServicesMock.ensureInCurrentSpace({ agentPolicyIds: ['123'] })
      ).resolves.toBeUndefined();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds
      ).not.toHaveBeenCalled();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
      ).toHaveBeenCalledWith(expect.anything(), ['123']);
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
      ).not.toHaveBeenCalled();
    });

    it('should check agent Ids, integration policy id and agent policy ids', async () => {
      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          integrationPolicyIds: ['123'],
          agentIds: ['123'],
          agentPolicyIds: ['123'],
        })
      ).resolves.toBeUndefined();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds
      ).toHaveBeenCalledWith(['123']);
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
      ).toHaveBeenCalledWith(expect.anything(), ['123']);
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
      ).toHaveBeenCalledWith(expect.anything(), ['123']);
    });

    it('should throw error any of the data is not visible in current space', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds.mockImplementation(
        async () => {
          throw new AgentNotFoundError('not found mock');
        }
      );
      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          integrationPolicyIds: ['123'],
          agentIds: ['123'],
          agentPolicyIds: ['123'],
        })
      ).rejects.toThrowError(NotFoundError);
    });
  });

  describe('Policy namespace methods', () => {
    let integrationPolicy: PackagePolicy;
    let agentPolicy1: AgentPolicy;
    let agentPolicy2: AgentPolicy;

    beforeEach(() => {
      const agentPolicyGenerator = new FleetAgentPolicyGenerator('seed');
      const integrationPolicyGenerator = new FleetPackagePolicyGenerator('seed');

      agentPolicy1 = agentPolicyGenerator.generate({ namespace: 'foo1' });
      agentPolicy2 = agentPolicyGenerator.generate({ namespace: 'foo2' });
      integrationPolicy = integrationPolicyGenerator.generate({
        namespace: undefined,
        policy_ids: [agentPolicy1.id, agentPolicy2.id],
      });

      fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs.mockResolvedValue(
        [integrationPolicy]
      );
      fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds.mockResolvedValue(
        [agentPolicy1, agentPolicy2]
      );
    });

    describe('#getPolicyNamespace()', () => {
      it('should return namespace from agent policies if integration policy does not have one defined', async () => {
        await expect(
          fleetServicesMock.getPolicyNamespace({
            integrationPolicies: [integrationPolicy.id],
          })
        ).resolves.toEqual({
          integrationPolicy: {
            [integrationPolicy.id]: ['foo1', 'foo2'],
          },
        });
        expect(
          fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
        ).toHaveBeenCalledWith(expect.anything(), [agentPolicy1.id, agentPolicy2.id]);
      });

      it('should return namespace from integration policy if defined', async () => {
        integrationPolicy.namespace = 'bar';

        await expect(
          fleetServicesMock.getPolicyNamespace({
            integrationPolicies: [integrationPolicy.id],
          })
        ).resolves.toEqual({
          integrationPolicy: {
            [integrationPolicy.id]: ['bar'],
          },
        });

        // The agentPolicy sevice should not have been called because the package policy has
        // a namespace id, so no need.
        expect(
          fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
        ).not.toHaveBeenCalled();
      });
    });

    describe('#getIntegrationNamespaces()', () => {
      beforeEach(() => {
        integrationPolicy.package!.name = 'packageOne';

        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.list.mockResolvedValue(
          {
            items: [integrationPolicy],
            page: 1,
            total: 1,
            perPage: 20,
          }
        );
      });

      it('should call fleet package policy service with expected arguments', async () => {
        await expect(fleetServicesMock.getIntegrationNamespaces(['packageOne', 'packageTwo']))
          .resolves;
        expect(
          fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.list
        ).toHaveBeenCalledWith(expect.anything(), {
          perPage: 10_000,
          kuery: 'ingest-package-policies.package.name: (packageOne OR packageTwo)',
        });
      });

      it('should return namespaces from integration policy when defined', async () => {
        integrationPolicy.namespace = 'ns_one';

        await expect(
          fleetServicesMock.getIntegrationNamespaces(['packageOne', 'packageTwo'])
        ).resolves.toEqual({
          packageOne: ['ns_one'],
          packageTwo: [],
        });
      });

      it('should return namespaces from agent policies if integration policy does not have one defined', async () => {
        await expect(
          fleetServicesMock.getIntegrationNamespaces(['packageOne', 'packageTwo'])
        ).resolves.toEqual({
          packageOne: ['foo1', 'foo2'],
          packageTwo: [],
        });
      });
    });
  });
});
