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
    let defaultPackagePolicy1: GetOnePackagePolicyResponse;

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await setupTestUsers(getService('security'), true);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClient.postEnableSpaceAwareness();
      const _policyRes = await apiClient.createAgentPolicy();
      defaultSpacePolicy1 = _policyRes;
      await apiClient.installPackage({
        pkgName: 'nginx',
        pkgVersion: '1.20.0',
        force: true, // To avoid package verification
      });
      await createFleetAgent(esClient, defaultSpacePolicy1.item.id);
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
        expect(agents.total).to.be(1);
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
        expect(agents.total).to.be(0);
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
          /400 Bad Request No enough permissions to create policies in space test1/
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
          /400 Bad Request No enough permissions to remove policies from space test1/
        );
      });
    });
  });
}
