/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import { indexEndpointHostForPolicy } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_endpoint_hosts';
import { mergeAndAppendArrays } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import { HostMetadataInterface } from '@kbn/security-solution-plugin/common/endpoint/types';
import { Agent, AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { indexFleetEndpointPolicy } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { enableFleetServerIfNecessary } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_server';
import { updateAgentPolicy } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');
  const policyTestResources = getService('endpointPolicyTestResources');
  const endpointTestResources = getService('endpointTestResources');
  const kbnServer = getService('kibanaServer');
  const esClient = getService('es');
  const log = getService('log');

  describe('@ess @skipInServerless, @skipInServerlessMKI Response actions space awareness support', () => {
    const afterEachDataCleanup: Array<{ cleanup: () => Promise<void> }> = [];
    const spaceOneId = 'space_one';
    const spaceTwoId = 'space_two';

    before(async () => {
      await Promise.all([
        ensureSpaceIdExists(kbnServer, spaceOneId, { log }),
        ensureSpaceIdExists(kbnServer, spaceTwoId, { log }),
      ]);
    });

    interface IndexedData {
      agentPolicies: AgentPolicy[];
      integrationPolicies: PackagePolicy[];
      hostMetadata: HostMetadataInterface[];
      agents: Agent[];
      cleanup(): Promise<void>;
    }

    const setupData = async (): Promise<{
      /** data is set up so that it is only accessible from space one */
      spaceOne: IndexedData;
      /** data is set up so that it is only accessible from space two */
      spaceTwo: IndexedData;
      /** data is set up so that it includes agents from both spaces */
      shared: IndexedData;
      cleanup: () => Promise<void>;
    }> => {
      const spaceTwoKbnClient = endpointTestResources.getScopedKbnClient(spaceTwoId);
      const endpointPackage = await policyTestResources.getEndpointPackage();

      const indexDataIntoSpace = async (spaceId: string, name: string): Promise<IndexedData> => {
        const spaceData: IndexedData = {
          agents: [],
          integrationPolicies: [],
          hostMetadata: [],
          agentPolicies: [],
          cleanup: async (): Promise<void> => {
            // Implement
          },
        };
        const kbnClient = endpointTestResources.getScopedKbnClient(spaceId);
        await enableFleetServerIfNecessary(esClient, false, kbnClient, log);

        // Index Policies
        const policies = await indexFleetEndpointPolicy(
          kbnClient,
          `${spaceId} integration policy ${name}`,
          endpointPackage.version,
          `${spaceId} agent policy ${name}`,
          log,
          [spaceId]
        );

        Object.assign(spaceData, policies);

        // Index fleet agent and endpoint host metadata
        const host = await indexEndpointHostForPolicy({
          esClient,
          kbnClient,
          logger: log,
          integrationPolicyId: policies.integrationPolicies[0].id,
          overrides: {
            host: {
              name: `${spaceId} host ${name}`,
              hostname: `${spaceId} host ${name}`,
            },
          },
        });

        spaceData.hostMetadata = host.hosts as HostMetadataInterface[];
        spaceData.agents = host.agents as Agent[];

        log.info(`Data for space [${spaceId}] loaded`);

        return spaceData;
      };

      const spaceOne = await indexDataIntoSpace(spaceOneId, '1 - NOT SHARED');
      const spaceTwo = await indexDataIntoSpace(spaceTwoId, '1 - NOT SHARED');
      const shared = await indexDataIntoSpace(spaceOneId, `2 - SHARED WITH ${spaceTwoId}`);

      // Make sure the shared policy is shared with space two
      await updateAgentPolicy(
        endpointTestResources.getScopedKbnClient(spaceOneId),
        shared.agentPolicies[0].id,
        { space_ids: [spaceOneId, spaceTwoId] },
        true
      );

      // Add a new endpoint/agent to spaceTwo under the same shared policy.
      const sharedIntegrationPolicy = shared.integrationPolicies[0];
      const spaceTwoSharedEndpointHost = await indexEndpointHostForPolicy({
        esClient,
        kbnClient: spaceTwoKbnClient,
        integrationPolicyId: sharedIntegrationPolicy.id,
        overrides: {
          host: {
            name: `${spaceTwoId} host 2 on shared policy`,
            hostname: `${spaceTwoId} host 2 on shared policy`,
          },
        },
        logger: log,
      });

      await endpointTestResources.waitForUnitedEndpoints([
        spaceTwoSharedEndpointHost.hosts[0].agent.id,
      ]);

      mergeAndAppendArrays(spaceTwo, spaceTwoSharedEndpointHost);

      const cleanup = async (): Promise<void> => {
        await Promise.all([
          // FIXME:PT implement
        ]);
      };

      return {
        spaceOne,
        spaceTwo,
        shared,
        cleanup,
      };
    };

    describe('when creating actions', () => {
      // FIXME:PT change to `beforeEach()`
      before(async () => {
        await setupData();
      });

      it('should create action if all agent ids are accessible in active space', async () => {
        throw new Error('TODO: implement');
      });

      it('should error if at least one agent is not accessible in active space', async () => {
        throw new Error('TODO: implement');
      });
    });

    describe('when fetching list of actions', () => {
      it('should return all actions sent to agents that are accessible in active space', () => {
        throw new Error('TODO: implement');
        // TODO: implement
      });
    });

    describe('when fetching single action', () => {
      it('should return action if at least 1 agent is accessible in active space', () => {
        throw new Error('TODO: implement');
        // TODO: implement
      });

      it('should error if none of the agents are accessible in active space', async () => {
        throw new Error('TODO: implement');
        // TODO: implement
      });
    });
  });
}
