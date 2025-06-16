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
import { cleanFleetIndices, expectToRejectWithError, expectToRejectWithNotFound } from './helpers';
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
    const apiClientReadOnly = new SpaceTestApiClient(supertestWithoutAuth, {
      username: testUsers.fleet_read_only.username,
      password: testUsers.fleet_read_only.password,
    });
    const apiClientDefaultSpaceOnly = new SpaceTestApiClient(supertestWithoutAuth, {
      username: testUsers.fleet_all_int_all_default_space_only.username,
      password: testUsers.fleet_all_int_all_default_space_only.password,
    });

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let spaceTest1Policy1: CreateAgentPolicyResponse;
    let spaceTest1Policy2: CreateAgentPolicyResponse;
    let defaultAndTestSpacePolicy: CreateAgentPolicyResponse;

    before(async () => {
      await setupTestUsers(getService('security'), true);
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClient.postEnableSpaceAwareness();

      await spaces.createTestSpace(TEST_SPACE_1);
      const [
        _defaultSpacePolicy1,
        _spaceTest1Policy1,
        _spaceTest1Policy2,
        _defaultAndTestSpacePolicy,
      ] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(undefined, {
          space_ids: ['default', TEST_SPACE_1],
        }),
      ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      spaceTest1Policy1 = _spaceTest1Policy1;
      spaceTest1Policy2 = _spaceTest1Policy2;
      defaultAndTestSpacePolicy = _defaultAndTestSpacePolicy;
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
        expect(agentPolicies.total).to.eql(3);
        const policyIds = agentPolicies.items?.map((item) => item.id);
        expect(policyIds).to.contain(spaceTest1Policy1.item.id);
        expect(policyIds).to.contain(spaceTest1Policy2.item.id);
        expect(policyIds).to.contain(defaultAndTestSpacePolicy.item.id);
        expect(policyIds).not.to.contain(defaultSpacePolicy1.item.id);
      });

      it('should return policies in default space', async () => {
        const agentPolicies = await apiClient.getAgentPolicies();
        expect(agentPolicies.total).to.eql(2);
        const policyIds = agentPolicies.items?.map((item) => item.id);
        expect(policyIds).not.to.contain(spaceTest1Policy1.item.id);
        expect(policyIds).not.contain(spaceTest1Policy2.item.id);
        expect(policyIds).to.contain(defaultSpacePolicy1.item.id);
        expect(policyIds).to.contain(defaultAndTestSpacePolicy.item.id);
      });

      it('should return only spaces user can access', async () => {
        const agentPolicies = await apiClientDefaultSpaceOnly.getAgentPolicies();

        expect(
          agentPolicies.items.find((item) => item.id === defaultAndTestSpacePolicy.item.id)
            ?.space_ids
        ).to.eql(['default', '?']);
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

      it('should return only spaces user can access', async () => {
        const policyRes = await apiClientDefaultSpaceOnly.getAgentPolicy(
          defaultAndTestSpacePolicy.item.id
        );

        expect(policyRes.item.space_ids).to.eql(['default', '?']);
      });
    });

    describe('POST /agent_policies', () => {
      it('should create fleet-server-policy in the default space', async () => {
        const res = await apiClient.createAgentPolicy('default', {
          has_fleet_server: true,
        });
        expect(res.item.id).to.eql('fleet-server-policy');
      });

      it('should create fleet-server-policy in the test space', async () => {
        const res = await apiClient.createAgentPolicy(TEST_SPACE_1, {
          has_fleet_server: true,
        });
        expect(res.item.id).to.eql(`${TEST_SPACE_1}-fleet-server-policy`);
      });

      it('should allow to create a policy in another space user has permissions from default space', async () => {
        const res = await apiClient.createAgentPolicy('default', {
          space_ids: [TEST_SPACE_1],
        });

        const policyId = res.item.id;
        await expectToRejectWithNotFound(() => apiClient.getAgentPolicy(spaceTest1Policy1.item.id));

        const policyFound = await apiClient.getAgentPolicy(policyId, TEST_SPACE_1);
        expect(policyFound.item.id).to.eql(policyId);
      });

      it('should not allow to create a policy in another space when user do not have permissions from default space', async () => {
        await expectToRejectWithError(
          () =>
            apiClientDefaultSpaceOnly.createAgentPolicy('default', {
              space_ids: [TEST_SPACE_1],
            }),
          /No enough permissions to create policies in space test1/
        );
      });
    });

    describe('GET /agent_policies_spaces', () => {
      it('should return all spaces user can write agent policies to', async () => {
        const res = await apiClient.getAgentPoliciesSpaces();

        expect(res.items.map(({ id }: { id: string }) => id)).to.eql(['default', 'test1']);
      });

      it('should return no spaces for user with readonly access', async () => {
        const res = await apiClientReadOnly.getAgentPoliciesSpaces();

        expect(res.items.map(({ id }: { id: string }) => id)).to.eql([]);
      });
    });
  });
}
