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
  const createFleetAgent = async (agentPolicyId: string, spaceId?: string) => {
    const agentResponse = await esClient.index({
      index: '.fleet-agents',
      refresh: true,
      body: {
        access_api_key_id: 'api-key-3',
        active: true,
        policy_id: agentPolicyId,
        policy_revision_idx: 1,
        last_checkin_status: 'online',
        type: 'PERMANENT',
        local_metadata: {
          host: { hostname: 'host123' },
          elastic: { agent: { version: '8.15.0' } },
        },
        user_provided_metadata: {},
        enrolled_at: new Date().toISOString(),
        last_checkin: new Date().toISOString(),
        tags: ['tag1'],
        namespaces: spaceId ? [spaceId] : undefined,
      },
    });

    return agentResponse._id;
  };
  describe('agents', async function () {
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

    let defaultSpaceAgent1: string;
    let defaultSpaceAgent2: string;
    let testSpaceAgent1: string;
    let testSpaceAgent2: string;

    before(async () => {
      const [_defaultSpacePolicy1, _spaceTest1Policy1, _spaceTest1Policy2] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      spaceTest1Policy1 = _spaceTest1Policy1;
      spaceTest1Policy2 = _spaceTest1Policy2;

      const [_defaultSpaceAgent1, _defaultSpaceAgent2, _testSpaceAgent1, _testSpaceAgent2] =
        await Promise.all([
          createFleetAgent(defaultSpacePolicy1.item.id, 'default'),
          createFleetAgent(defaultSpacePolicy1.item.id),
          createFleetAgent(spaceTest1Policy1.item.id, TEST_SPACE_1),
          createFleetAgent(spaceTest1Policy2.item.id, TEST_SPACE_1),
        ]);

      defaultSpaceAgent1 = _defaultSpaceAgent1;
      defaultSpaceAgent2 = _defaultSpaceAgent2;
      testSpaceAgent1 = _testSpaceAgent1;
      testSpaceAgent2 = _testSpaceAgent2;
    });

    describe('GET /agents', () => {
      it('should return agents in a specific space', async () => {
        const agents = await apiClient.getAgents(TEST_SPACE_1);
        expect(agents.total).to.eql(2);
        const agentIds = agents.items?.map((item) => item.id);
        expect(agentIds).to.contain(testSpaceAgent1);
        expect(agentIds).to.contain(testSpaceAgent2);
      });

      it('should return agents in default space', async () => {
        const agents = await apiClient.getAgents();
        expect(agents.total).to.eql(2);
        const agentIds = agents.items?.map((item) => item.id);
        expect(agentIds).to.contain(defaultSpaceAgent1);
        expect(agentIds).to.contain(defaultSpaceAgent2);
      });
    });

    describe('GET /agents/{id}', () => {
      it('should allow to retrieve agent in the same space', async () => {
        await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
      });

      it('should not allow to get an agent from a different space from the default space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.getAgent(testSpaceAgent1);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });
    });
  });
}
