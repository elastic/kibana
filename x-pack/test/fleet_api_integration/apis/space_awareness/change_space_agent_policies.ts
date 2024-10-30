/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateAgentPolicyResponse, GetOnePackagePolicyResponse } from '@kbn/fleet-plugin/common';
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

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('change space agent policies', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let defaultSpacePolicy2: CreateAgentPolicyResponse;
    let defaultPackagePolicy1: GetOnePackagePolicyResponse;

    let policy1AgentId: string;
    let policy2AgentId: string;

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
      async function assertPolicyAvailableInSpace(spaceId?: string) {
        await apiClient.getAgentPolicy(defaultSpacePolicy1.item.id, spaceId);
        await apiClient.getPackagePolicy(defaultPackagePolicy1.item.id, spaceId);
        const enrollmentApiKeys = await apiClient.getEnrollmentApiKeys(spaceId);
        expect(
          enrollmentApiKeys.items.find((item) => item.policy_id === defaultSpacePolicy1.item.id)
        ).not.to.be(undefined);

        const agents = await apiClient.getAgents(spaceId);
        expect(
          agents.items.filter((a) => a.policy_id === defaultSpacePolicy1.item.id).length
        ).to.be(1);
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

      async function assertPolicyNotAvailableInSpace(spaceId?: string) {
        await expectToRejectWithNotFound(() =>
          apiClient.getPackagePolicy(defaultPackagePolicy1.item.id, spaceId)
        );
        await expectToRejectWithNotFound(() =>
          apiClient.getAgentPolicy(defaultSpacePolicy1.item.id, spaceId)
        );

        const enrollmentApiKeys = await apiClient.getEnrollmentApiKeys(spaceId);
        expect(
          enrollmentApiKeys.items.find((item) => item.policy_id === defaultSpacePolicy1.item.id)
        ).to.be(undefined);

        const agents = await apiClient.getAgents(spaceId);
        expect(
          agents.items.filter((a) => a.policy_id === defaultSpacePolicy1.item.id).length
        ).to.be(0);
      }

      async function assertAgentSpaces(agentId: string, expectedSpaces: string[]) {
        const agentDoc = await getFleetAgentDoc(esClient, agentId);

        if (expectedSpaces.length === 1 && expectedSpaces[0] === 'default') {
          expect(agentDoc._source?.namespaces ?? ['default']).to.eql(expectedSpaces);
        } else {
          expect(agentDoc._source?.namespaces).to.eql(expectedSpaces);
        }
      }

      it('should allow set policy in multiple space', async () => {
        await apiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
          name: 'tata',
          namespace: 'default',
          description: 'tata',
          space_ids: ['default', TEST_SPACE_1],
        });

        await assertPolicyAvailableInSpace();
        await assertPolicyAvailableInSpace(TEST_SPACE_1);

        await assertAgentSpaces(policy1AgentId, ['default', TEST_SPACE_1]);
        await assertAgentSpaces(policy2AgentId, ['default']);

        await assertEnrollemntApiKeysForSpace('default', [
          defaultSpacePolicy1.item.id,
          defaultSpacePolicy2.item.id,
        ]);
        await assertEnrollemntApiKeysForSpace(TEST_SPACE_1, [defaultSpacePolicy1.item.id]);
      });

      it('should allow set policy in test space only', async () => {
        await apiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
          name: 'tata',
          namespace: 'default',
          description: 'tata',
          space_ids: [TEST_SPACE_1],
        });

        await assertPolicyNotAvailableInSpace();
        await assertPolicyAvailableInSpace(TEST_SPACE_1);
        await assertAgentSpaces(policy1AgentId, [TEST_SPACE_1]);
        await assertAgentSpaces(policy2AgentId, ['default']);
        await assertEnrollemntApiKeysForSpace('default', [defaultSpacePolicy2.item.id]);
        await assertEnrollemntApiKeysForSpace(TEST_SPACE_1, [defaultSpacePolicy1.item.id]);
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
