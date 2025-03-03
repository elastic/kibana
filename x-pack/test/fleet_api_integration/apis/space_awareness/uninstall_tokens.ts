/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import { UninstallTokenMetadata } from '@kbn/fleet-plugin/common/types/models/uninstall_token';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices, expectToRejectWithNotFound } from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('uninstall tokens', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let spaceTest1Policy1: CreateAgentPolicyResponse;
    let spaceTest1Policy2: CreateAgentPolicyResponse;
    let defaultSpaceToken: UninstallTokenMetadata;
    let spaceTest1Token: UninstallTokenMetadata;

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
      await spaces.createTestSpace(TEST_SPACE_1);
      // Create agent policies it should create am uninstall token for every keys
      await apiClient.postEnableSpaceAwareness();
      const [_defaultSpacePolicy1, _spaceTest1Policy1, _spaceTest1Policy2] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      spaceTest1Policy1 = _spaceTest1Policy1;
      spaceTest1Policy2 = _spaceTest1Policy2;

      const space1Tokens = await apiClient.getUninstallTokens(TEST_SPACE_1);
      const defaultSpaceTokens = await apiClient.getUninstallTokens();
      defaultSpaceToken = defaultSpaceTokens.items[0];
      spaceTest1Token = space1Tokens.items[0];
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    describe('GET /uninstall_tokens', () => {
      it('should return uninstall_tokens in a specific space', async () => {
        const tokens = await apiClient.getUninstallTokens(TEST_SPACE_1);
        expect(tokens.total).to.eql(2);
        const policyIds = tokens.items?.map((item) => item.policy_id);
        expect(policyIds).to.contain(spaceTest1Policy1.item.id);
        expect(policyIds).to.contain(spaceTest1Policy2.item.id);
        expect(policyIds).not.to.contain(defaultSpacePolicy1.item.id);
      });

      it('should return uninstall_tokens in default space', async () => {
        const tokens = await apiClient.getUninstallTokens();
        expect(tokens.total).to.eql(1);
        const policyIds = tokens.items?.map((item) => item.policy_id);
        expect(policyIds).not.to.contain(spaceTest1Policy1.item.id);
        expect(policyIds).not.contain(spaceTest1Policy2.item.id);
        expect(policyIds).to.contain(defaultSpacePolicy1.item.id);
      });
    });

    describe('GET /uninstall_tokens/{id}', () => {
      it('should allow to access a uninstall token in a specific space', async () => {
        await apiClient.getUninstallToken(spaceTest1Token.id, TEST_SPACE_1);
      });
      it('should not allow to get an uninstall token from a different space from the default space', async () => {
        await expectToRejectWithNotFound(() => apiClient.getUninstallToken(spaceTest1Token.id));
      });

      it('should not allow to get an default space uninstall token from a different space', async () => {
        await expectToRejectWithNotFound(() =>
          apiClient.getUninstallToken(defaultSpaceToken.id, TEST_SPACE_1)
        );
      });
    });
  });
}
