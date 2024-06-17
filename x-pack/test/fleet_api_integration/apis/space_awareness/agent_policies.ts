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
import { cleanFleetIndices } from './helpers';
import { setupTestSpaces, TEST_SPACE_1 } from './space_helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('agent policies', async function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    setupTestSpaces(providerContext);
    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let spaceTest1Policy1: CreateAgentPolicyResponse;
    let spaceTest1Policy2: CreateAgentPolicyResponse;
    before(async () => {
      const [_defaultSpacePolicy1, _spaceTest1Policy1, _spaceTest1Policy2] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      spaceTest1Policy1 = _spaceTest1Policy1;
      spaceTest1Policy2 = _spaceTest1Policy2;
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
        let err: Error | undefined;
        try {
          await apiClient.getAgentPolicy(spaceTest1Policy1.item.id);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });

      it('should not allow to get an default space policy from a different space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.getAgentPolicy(defaultSpacePolicy1.item.id, TEST_SPACE_1);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });
    });
  });
}
