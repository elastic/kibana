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
import {
  type AgentPolicy,
  type PackagePolicy,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import { FleetAgentPolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_policy_generator';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { FleetAgentGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_generator';

describe('EndpointServiceFactory', () => {
  let fleetServicesMock: EndpointInternalFleetServicesInterfaceMocked;
  let fleetServicesFactoryMock: CreateEndpointFleetServicesFactoryResponse;

  beforeEach(() => {
    fleetServicesFactoryMock = createEndpointFleetServicesFactoryMock();
    fleetServicesMock = fleetServicesFactoryMock.service.asInternalUser();
  });

  it('should return fleet services when `asInternalUser()` is invoked', () => {
    expect(Object.keys(fleetServicesMock)).toEqual([
      'spaceId',
      'logger',
      'agent',
      'agentPolicy',
      'packages',
      'packagePolicy',
      'savedObjects',
      'endpointPolicyKuery',
      'ensureInCurrentSpace',
      'getPolicyNamespace',
      'getIntegrationNamespaces',
      'getSoClient',
    ]);
  });

  describe('#ensureInCurentSpace()', () => {
    it('should check agent ids', async () => {
      await expect(
        fleetServicesMock.ensureInCurrentSpace({ agentIds: ['123'] })
      ).resolves.toBeUndefined();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds
      ).toHaveBeenCalledWith(['123'], { ignoreMissing: false });
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
      ).not.toHaveBeenCalled();
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
      ).not.toHaveBeenCalled();
    });

    it('should error when at least one agent is not accessible and `matchAll` is `true`', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds.mockImplementation(
        async () => {
          throw new Error(`Fleet agent not found mock`);
        }
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          agentIds: ['123', '321'],
          options: { matchAll: true },
        })
      ).rejects.toThrow('Fleet agent not found mock');

      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds
      ).toHaveBeenCalledWith(['123', '321'], { ignoreMissing: false });
    });

    it('should error when `matchAll` is `false` and none of the agents are accessible in active space', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds.mockResolvedValue(
        []
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          agentIds: ['123', '321'],
          options: { matchAll: false },
        })
      ).rejects.toThrow('Agent ID(s) not found: [123, 321]');

      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds
      ).toHaveBeenCalledWith(['123', '321'], { ignoreMissing: true });
    });

    it('should NOT error when at lest one agent is accessible and `matchAll` is `false`', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds.mockResolvedValue(
        [new FleetAgentGenerator('seed').generate({ id: '321' })]
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          agentIds: ['123', '321'],
          options: { matchAll: false },
        })
      ).resolves.toBeUndefined();

      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentService.asInternalUser.getByIds
      ).toHaveBeenCalledWith(['123', '321'], { ignoreMissing: true });
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
      ).toHaveBeenCalledWith(expect.anything(), ['123'], { ignoreMissing: false });
    });

    it('should error when at least one integration policy ID is not accessible and `matchAll` is `true`', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs.mockImplementation(
        async () => {
          throw new Error('package policy not found in fleet mock');
        }
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          integrationPolicyIds: ['123'],
          options: { matchAll: true },
        })
      ).rejects.toThrow('package policy not found in fleet mock');
    });

    it('should error when `matchAll` is `false` and none of the integration policy IDs are accessible in active space', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs.mockResolvedValue(
        []
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          integrationPolicyIds: ['123'],
          options: { matchAll: false },
        })
      ).rejects.toThrow('Integration policy ID(s) not found: [123]');

      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
      ).toHaveBeenCalledWith(expect.anything(), ['123'], { ignoreMissing: true });
    });

    it('should NOT error when at lest one integration policy ID is accessible and `matchAll` is `false`', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs.mockResolvedValue(
        [new FleetPackagePolicyGenerator('seed').generate({ id: '321' })]
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          integrationPolicyIds: ['321'],
          options: { matchAll: false },
        })
      ).resolves.toBeUndefined();
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
      ).toHaveBeenCalledWith(expect.anything(), ['123'], { ignoreMissing: false });
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
      ).not.toHaveBeenCalled();
    });

    it('should error when at least one agent policy ID is not accessible and `matchAll` is `true`', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds.mockImplementation(
        async () => {
          throw new Error('agent policy not found in fleet mock');
        }
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          agentPolicyIds: ['123'],
          options: { matchAll: true },
        })
      ).rejects.toThrow('agent policy not found in fleet mock');
    });

    it('should error when `matchAll` is `false` and none of the agent policy IDs are accessible in active space', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds.mockResolvedValue(
        []
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          agentPolicyIds: ['123'],
          options: { matchAll: false },
        })
      ).rejects.toThrow('Agent policy ID(s) not found: [123]');
    });

    it('should NOT error when at lest one agent policy ID is accessible and `matchAll` is `false`', async () => {
      fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds.mockResolvedValue(
        [new FleetAgentPolicyGenerator('seed').generate({ id: '321' })]
      );

      await expect(
        fleetServicesMock.ensureInCurrentSpace({
          agentPolicyIds: ['123', '321'],
          options: { matchAll: false },
        })
      ).resolves.toBeUndefined();
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
      ).toHaveBeenCalledWith(['123'], { ignoreMissing: false });
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
      ).toHaveBeenCalledWith(expect.anything(), ['123'], { ignoreMissing: false });
      expect(
        fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
      ).toHaveBeenCalledWith(expect.anything(), ['123'], { ignoreMissing: false });
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
        ).toHaveBeenCalledWith(expect.anything(), [agentPolicy1.id, agentPolicy2.id], {
          spaceId: undefined,
        });
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

      it('should query fleet using a `spaceId` when services are initialized with unscoped client', async () => {
        fleetServicesMock = fleetServicesFactoryMock.service.asInternalUser(undefined, true);
        await fleetServicesMock.getPolicyNamespace({
          integrationPolicies: [integrationPolicy.id],
        });

        expect(
          fleetServicesFactoryMock.dependencies.fleetDependencies.packagePolicyService.getByIDs
        ).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ spaceIds: ['*'] })
        );
        expect(
          fleetServicesFactoryMock.dependencies.fleetDependencies.agentPolicyService.getByIds
        ).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ spaceId: '*' })
        );
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
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: (packageOne OR packageTwo)`,
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
