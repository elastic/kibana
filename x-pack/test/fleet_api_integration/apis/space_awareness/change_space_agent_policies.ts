/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidV4 } from 'uuid';
import { Client } from '@elastic/elasticsearch';
import { CreateAgentPolicyResponse, GetOnePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import { FleetServerAgentAction } from '@kbn/fleet-plugin/common/types';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import {
  cleanFleetIndices,
  createFleetAgent,
  expectToRejectWithError,
  expectToRejectWithNotFound,
  getFleetAgentDoc,
} from './helpers';
import { testUsers, setupTestUsers } from '../test_users';

export async function createFleetAction(esClient: Client, agentId: string, spaceId?: string) {
  const actionResponse = await esClient.index({
    index: '.fleet-actions',
    refresh: 'wait_for',
    body: {
      '@timestamp': new Date().toISOString(),
      expiration: new Date().toISOString(),
      agents: [agentId],
      action_id: uuidV4(),
      data: {},
      type: 'UPGRADE',
      namespaces: spaceId ? [spaceId] : undefined,
    },
  });

  return actionResponse._id;
}

async function getFleetActionDoc(esClient: Client, actionId: string) {
  const actionResponse = await esClient.get<FleetServerAgentAction>({
    index: '.fleet-actions',
    id: actionId,
  });

  return actionResponse;
}

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  // Failing: See https://github.com/elastic/kibana/issues/209008
  // Failing: See https://github.com/elastic/kibana/issues/209008
  describe.skip('change space agent policies', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let defaultSpacePolicy2: CreateAgentPolicyResponse;
    let defaultPackagePolicy1: GetOnePackagePolicyResponse;

    let policy1AgentId: string;
    let policy2AgentId: string;

    let agent1ActionId: string;
    let agent2ActionId: string;

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await setupTestUsers(getService('security'), true);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClient.postEnableSpaceAwareness();
      const [_policyRes1, _policyRes2] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(),
      ]);
      defaultSpacePolicy1 = _policyRes1;
      defaultSpacePolicy2 = _policyRes2;
      await apiClient.installPackage({
        pkgName: 'nginx',
        pkgVersion: '1.20.0',
        force: true, // To avoid package verification
      });
      policy1AgentId = await createFleetAgent(esClient, defaultSpacePolicy1.item.id);
      policy2AgentId = await createFleetAgent(esClient, defaultSpacePolicy2.item.id);

      agent1ActionId = await createFleetAction(esClient, policy1AgentId, 'default');
      agent2ActionId = await createFleetAction(esClient, policy2AgentId, 'default');

      const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
        policy_ids: [defaultSpacePolicy1.item.id],
        name: `test-nginx-${Date.now()}`,
        description: 'test',
        package: {
          name: 'nginx',
          version: '1.20.0',
        },
        inputs: {},
      });
      defaultPackagePolicy1 = packagePolicyRes;
      await spaces.createTestSpace(TEST_SPACE_1);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    describe('PUT /agent_policies/{id}', () => {
      beforeEach(async () => {
        // Reset policy in default space
        await apiClient
          .putAgentPolicy(
            defaultSpacePolicy1.item.id,
            {
              name: 'tata',
              namespace: 'default',
              description: 'tata',
              space_ids: ['default'],
            },
            TEST_SPACE_1
          )
          .catch(() => {});
        await apiClient
          .putAgentPolicy(defaultSpacePolicy1.item.id, {
            name: 'tata',
            namespace: 'default',
            description: 'tata',
            space_ids: ['default'],
          })
          .catch(() => {});
      });

      async function assertPackagePolicyAvailableInSpace(spaceId?: string) {
        await apiClient.getPackagePolicy(defaultPackagePolicy1.item.id, spaceId);
      }

      async function assertPackagePolicyNotAvailableInSpace(spaceId?: string) {
        await expectToRejectWithNotFound(() =>
          apiClient.getPackagePolicy(defaultPackagePolicy1.item.id, spaceId)
        );
      }

      async function assertAgentPolicyAvailableInSpace(policyId: string, spaceId?: string) {
        await apiClient.getAgentPolicy(policyId, spaceId);
        const enrollmentApiKeys = await apiClient.getEnrollmentApiKeys(spaceId);
        expect(enrollmentApiKeys.items.find((item) => item.policy_id === policyId)).not.to.be(
          undefined
        );

        const agents = await apiClient.getAgents(spaceId);
        expect(agents.items.filter((a) => a.policy_id === policyId).length).to.be(1);

        const uninstallTokens = await apiClient.getUninstallTokens(spaceId);
        expect(uninstallTokens.items.filter((t) => t.policy_id === policyId).length).to.be(1);
      }

      async function assertEnrollemntApiKeysForSpace(spaceId?: string, policyIds?: string[]) {
        const spaceApiKeys = await apiClient.getEnrollmentApiKeys(spaceId);

        const foundPolicyIds = spaceApiKeys.items.reduce((acc, apiKey) => {
          if (apiKey.policy_id) {
            acc.add(apiKey.policy_id);
          }
          return acc;
        }, new Set<string>());

        expect([...foundPolicyIds].sort()).to.eql(policyIds?.sort());
      }

      async function assertAgentPolicyNotAvailableInSpace(policyId: string, spaceId?: string) {
        await expectToRejectWithNotFound(() => apiClient.getAgentPolicy(policyId, spaceId));

        const enrollmentApiKeys = await apiClient.getEnrollmentApiKeys(spaceId);
        expect(enrollmentApiKeys.items.find((item) => item.policy_id === policyId)).to.be(
          undefined
        );

        const agents = await apiClient.getAgents(spaceId);
        expect(agents.items.filter((a) => a.policy_id === policyId).length).to.be(0);

        const uninstallTokens = await apiClient.getUninstallTokens(spaceId);
        expect(uninstallTokens.items.filter((t) => t.policy_id === policyId).length).to.be(0);
      }

      async function assertAgentSpaces(agentId: string, expectedSpaces: string[]) {
        const agentDoc = await getFleetAgentDoc(esClient, agentId);

        if (expectedSpaces.length === 1 && expectedSpaces[0] === 'default') {
          expect(agentDoc._source?.namespaces ?? ['default']).to.eql(expectedSpaces);
        } else {
          expect(agentDoc._source?.namespaces).to.eql(expectedSpaces);
        }
      }

      async function assertActionSpaces(actionId: string, expectedSpaces: string[]) {
        const actionDoc = await getFleetActionDoc(esClient, actionId);
        if (expectedSpaces.length === 1 && expectedSpaces[0] === 'default') {
          expect(actionDoc._source?.namespaces ?? ['default']).to.eql(expectedSpaces);
        } else {
          expect(actionDoc._source?.namespaces).to.eql(expectedSpaces);
        }
      }

      it('should allow set policy in multiple space', async () => {
        await apiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
          name: 'tata',
          namespace: 'default',
          description: 'tata',
          space_ids: ['default', TEST_SPACE_1],
        });

        await assertAgentPolicyAvailableInSpace(defaultSpacePolicy1.item.id);
        await assertAgentPolicyAvailableInSpace(defaultSpacePolicy1.item.id, TEST_SPACE_1);

        await assertPackagePolicyAvailableInSpace();
        await assertPackagePolicyAvailableInSpace(TEST_SPACE_1);

        await assertAgentSpaces(policy1AgentId, ['default', TEST_SPACE_1]);
        await assertAgentSpaces(policy2AgentId, ['default']);

        await assertActionSpaces(agent1ActionId, ['default']);
        await assertActionSpaces(agent2ActionId, ['default']);

        await assertEnrollemntApiKeysForSpace('default', [
          defaultSpacePolicy1.item.id,
          defaultSpacePolicy2.item.id,
        ]);
        await assertEnrollemntApiKeysForSpace(TEST_SPACE_1, [defaultSpacePolicy1.item.id]);
        // Ensure no side effect on other policies
        await assertAgentPolicyAvailableInSpace(defaultSpacePolicy2.item.id);
        await assertAgentPolicyNotAvailableInSpace(defaultSpacePolicy2.item.id, TEST_SPACE_1);
      });

      it('should allow set policy in test space only', async () => {
        await apiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
          name: 'tata',
          namespace: 'default',
          description: 'tata',
          space_ids: [TEST_SPACE_1],
        });

        await assertAgentPolicyNotAvailableInSpace(defaultSpacePolicy1.item.id);
        await assertAgentPolicyAvailableInSpace(defaultSpacePolicy1.item.id, TEST_SPACE_1);
        await assertPackagePolicyAvailableInSpace(TEST_SPACE_1);
        await assertPackagePolicyNotAvailableInSpace();
        await assertAgentSpaces(policy1AgentId, [TEST_SPACE_1]);
        await assertAgentSpaces(policy2AgentId, ['default']);

        await assertActionSpaces(agent1ActionId, ['default']);
        await assertActionSpaces(agent2ActionId, ['default']);

        await assertEnrollemntApiKeysForSpace('default', [defaultSpacePolicy2.item.id]);
        await assertEnrollemntApiKeysForSpace(TEST_SPACE_1, [defaultSpacePolicy1.item.id]);
        // Ensure no side effect on other policies
        await assertAgentPolicyAvailableInSpace(defaultSpacePolicy2.item.id);
        await assertAgentPolicyNotAvailableInSpace(defaultSpacePolicy2.item.id, TEST_SPACE_1);
      });

      it('should not allow add policy to a space where user do not have access', async () => {
        const testApiClient = new SpaceTestApiClient(
          supertestWithoutAuth,
          testUsers.fleet_all_int_all_default_space_only
        );

        await expectToRejectWithError(
          () =>
            testApiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
              name: 'tata',
              namespace: 'default',
              description: 'tata',
              space_ids: ['default', TEST_SPACE_1],
            }),
          /400 Bad Request Not enough permissions to create policies in space test1/
        );
      });

      it('should not allow to remove policy from a space where user do not have access', async () => {
        await apiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
          name: 'tata',
          namespace: 'default',
          description: 'tata',
          space_ids: ['default', TEST_SPACE_1],
        });

        const testApiClient = new SpaceTestApiClient(
          supertestWithoutAuth,
          testUsers.fleet_all_int_all_default_space_only
        );

        await expectToRejectWithError(
          () =>
            testApiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
              name: 'tata',
              namespace: 'default',
              description: 'tata',
              space_ids: ['default'],
            }),
          /400 Bad Request Not enough permissions to remove policies from space test1/
        );
      });
    });

    describe('DELETE /agent_policies/{id}', () => {
      let policyRes: CreateAgentPolicyResponse;
      before(async () => {
        const _policyRes = await apiClient.createAgentPolicy();
        policyRes = _policyRes;
        await apiClient.createPackagePolicy(undefined, {
          policy_ids: [policyRes.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });
        await apiClient.putAgentPolicy(policyRes.item.id, {
          name: `test-nginx-${Date.now()}`,
          namespace: 'default',
          description: 'tata',
          space_ids: ['default', TEST_SPACE_1],
        });
      });
      it('should allow to delete an agent policy through multiple spaces', async () => {
        await apiClient.deleteAgentPolicy(policyRes.item.id);
      });
    });
  });
}
