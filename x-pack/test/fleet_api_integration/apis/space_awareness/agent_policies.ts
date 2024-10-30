/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices, expectToRejectWithNotFound } from './helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('agent policies', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertestWithoutAuth, {
      username: testUsers.fleet_all_int_all.username,
      password: testUsers.fleet_all_int_all.password,
    });

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let spaceTest1Policy1: CreateAgentPolicyResponse;
    let spaceTest1Policy2: CreateAgentPolicyResponse;

    before(async () => {
      await setupTestUsers(getService('security'));
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClient.postEnableSpaceAwareness();

      const [_defaultSpacePolicy1, _spaceTest1Policy1, _spaceTest1Policy2] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      spaceTest1Policy1 = _spaceTest1Policy1;
      spaceTest1Policy2 = _spaceTest1Policy2;

      await spaces.createTestSpace(TEST_SPACE_1);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    describe('GET /agent_policies', () => {
      it('should return policies in a specific space', async () => {
        const agentPolicies = await apiClient.getAgentPolicies(TEST_SPACE_1);
        expect(agentPolicies.total).to.eql(2);
        const policyIds = agentPolicies.items?.map((item) => item.id);
        expect(policyIds).to.contain(spaceTest1Policy1.item.id);
        expect(policyIds).to.contain(spaceTest1Policy2.item.id);
        expect(policyIds).not.to.contain(defaultSpacePolicy1.item.id);
      });

      it('should return policies in default space', async () => {
        const agentPolicies = await apiClient.getAgentPolicies();
        expect(agentPolicies.total).to.eql(1);
        const policyIds = agentPolicies.items?.map((item) => item.id);
        expect(policyIds).not.to.contain(spaceTest1Policy1.item.id);
        expect(policyIds).not.contain(spaceTest1Policy2.item.id);
        expect(policyIds).to.contain(defaultSpacePolicy1.item.id);
      });
    });

    describe('GET /agent_policies/{id}', () => {
      it('should allow to access a policy in a specific space', async () => {
        await apiClient.getAgentPolicy(spaceTest1Policy1.item.id, TEST_SPACE_1);
      });
      it('should not allow to get a policy from a different space from the default space', async () => {
        await expectToRejectWithNotFound(() => apiClient.getAgentPolicy(spaceTest1Policy1.item.id));
      });

      it('should not allow to get an default space policy from a different space', async () => {
        await expectToRejectWithNotFound(() =>
          apiClient.getAgentPolicy(defaultSpacePolicy1.item.id, TEST_SPACE_1)
        );
      });
    });
  });
}
