/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateAgentPolicyResponse, GetAgentsResponse } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices, createFleetAgent } from './helpers';
import { setupTestSpaces, TEST_SPACE_1 } from './space_helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');

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
          createFleetAgent(esClient, defaultSpacePolicy1.item.id, 'default'),
          createFleetAgent(esClient, defaultSpacePolicy1.item.id),
          createFleetAgent(esClient, spaceTest1Policy1.item.id, TEST_SPACE_1),
          createFleetAgent(esClient, spaceTest1Policy2.item.id, TEST_SPACE_1),
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

    describe('PUT /agents/{id}', () => {
      it('should allow to update an agent in the same space', async () => {
        await apiClient.updateAgent(testSpaceAgent1, { tags: ['foo'] }, TEST_SPACE_1);
        await apiClient.updateAgent(testSpaceAgent1, { tags: ['tag1'] }, TEST_SPACE_1);
      });

      it('should not allow to update an agent from a different space from the default space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.updateAgent(testSpaceAgent1, { tags: ['foo'] });
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });
    });

    describe('DELETE /agents/{id}', () => {
      it('should allow to delete an agent in the same space', async () => {
        const testSpaceAgent3 = await createFleetAgent(
          esClient,
          spaceTest1Policy2.item.id,
          TEST_SPACE_1
        );
        await apiClient.deleteAgent(testSpaceAgent3, TEST_SPACE_1);
      });

      it('should not allow to delete an agent from a different space from the default space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.deleteAgent(testSpaceAgent1);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });
    });

    describe('POST /agents/bulkUpdateAgentTags', () => {
      function getAgentTags(agents: GetAgentsResponse) {
        return agents.items?.reduce((acc, item) => {
          acc[item.id] = item.tags;
          return acc;
        }, {} as any);
      }

      it('should only update tags of agents in the same space when passing a list of agent ids', async () => {
        let agents = await apiClient.getAgents(TEST_SPACE_1);
        let agentTags = getAgentTags(agents);
        expect(agentTags[testSpaceAgent1]).to.eql(['tag1']);
        expect(agentTags[testSpaceAgent2]).to.eql(['tag1']);
        // Add tag
        await apiClient.bulkUpdateAgentTags(
          {
            agents: [defaultSpaceAgent1, testSpaceAgent1],
            tagsToAdd: ['space1'],
          },
          TEST_SPACE_1
        );
        agents = await apiClient.getAgents(TEST_SPACE_1);
        agentTags = getAgentTags(agents);
        expect(agentTags[testSpaceAgent1]).to.eql(['tag1', 'space1']);
        expect(agentTags[testSpaceAgent2]).to.eql(['tag1']);
        // Reset tags
        await apiClient.bulkUpdateAgentTags(
          {
            agents: [testSpaceAgent1],
            tagsToRemove: ['space1'],
          },
          TEST_SPACE_1
        );
        agents = await apiClient.getAgents(TEST_SPACE_1);
        agentTags = getAgentTags(agents);
        expect(agentTags[testSpaceAgent1]).to.eql(['tag1']);
      });

      it('should only update tags of agents in the same space when passing a kuery', async () => {
        let agentsInDefaultSpace = await apiClient.getAgents();
        let agentInDefaultSpaceTags = getAgentTags(agentsInDefaultSpace);
        let agentsInTestSpace = await apiClient.getAgents(TEST_SPACE_1);
        let agentInTestSpaceTags = getAgentTags(agentsInTestSpace);
        expect(agentInDefaultSpaceTags[defaultSpaceAgent1]).to.eql(['tag1']);
        expect(agentInDefaultSpaceTags[defaultSpaceAgent2]).to.eql(['tag1']);
        expect(agentInTestSpaceTags[testSpaceAgent1]).to.eql(['tag1']);
        expect(agentInTestSpaceTags[testSpaceAgent2]).to.eql(['tag1']);
        // Add tag
        await apiClient.bulkUpdateAgentTags(
          {
            agents: '',
            tagsToAdd: ['space1'],
          },
          TEST_SPACE_1
        );
        agentsInDefaultSpace = await apiClient.getAgents();
        agentInDefaultSpaceTags = getAgentTags(agentsInDefaultSpace);
        agentsInTestSpace = await apiClient.getAgents(TEST_SPACE_1);
        agentInTestSpaceTags = getAgentTags(agentsInTestSpace);
        expect(agentInDefaultSpaceTags[defaultSpaceAgent1]).to.eql(['tag1']);
        expect(agentInDefaultSpaceTags[defaultSpaceAgent2]).to.eql(['tag1']);
        expect(agentInTestSpaceTags[testSpaceAgent1]).to.eql(['tag1', 'space1']);
        expect(agentInTestSpaceTags[testSpaceAgent2]).to.eql(['tag1', 'space1']);
        // Reset tags
        await apiClient.bulkUpdateAgentTags(
          {
            agents: '',
            tagsToRemove: ['space1'],
          },
          TEST_SPACE_1
        );
        agentsInTestSpace = await apiClient.getAgents(TEST_SPACE_1);
        agentInTestSpaceTags = getAgentTags(agentsInTestSpace);
        expect(agentInTestSpaceTags[testSpaceAgent1]).to.eql(['tag1']);
        expect(agentInTestSpaceTags[testSpaceAgent2]).to.eql(['tag1']);
      });
    });
  });
}
