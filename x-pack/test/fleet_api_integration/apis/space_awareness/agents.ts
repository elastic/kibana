/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  AGENTS_INDEX,
  CreateAgentPolicyResponse,
  GetAgentsResponse,
} from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import {
  cleanFleetActionIndices,
  cleanFleetAgents,
  cleanFleetIndices,
  createFleetAgent,
  makeAgentsUpgradeable,
} from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('agents', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let defaultSpacePolicy2: CreateAgentPolicyResponse;
    let spaceTest1Policy1: CreateAgentPolicyResponse;
    let spaceTest1Policy2: CreateAgentPolicyResponse;

    let defaultSpaceAgent1: string;
    let defaultSpaceAgent2: string;
    let testSpaceAgent1: string;
    let testSpaceAgent2: string;
    let testSpaceAgent3: string;

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
      await spaces.createTestSpace(TEST_SPACE_1);

      await apiClient.postEnableSpaceAwareness();

      const [_defaultSpacePolicy1, _defaultSpacePolicy2, _spaceTest1Policy1, _spaceTest1Policy2] =
        await Promise.all([
          apiClient.createAgentPolicy(),
          apiClient.createAgentPolicy(),
          apiClient.createAgentPolicy(TEST_SPACE_1),
          apiClient.createAgentPolicy(TEST_SPACE_1),
        ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      defaultSpacePolicy2 = _defaultSpacePolicy2;
      spaceTest1Policy1 = _spaceTest1Policy1;
      spaceTest1Policy2 = _spaceTest1Policy2;

      await createAgents();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    async function createAgents() {
      const [
        _defaultSpaceAgent1,
        _defaultSpaceAgent2,
        _testSpaceAgent1,
        _testSpaceAgent2,
        _testSpaceAgent3,
      ] = await Promise.all([
        createFleetAgent(esClient, defaultSpacePolicy1.item.id, 'default'),
        createFleetAgent(esClient, defaultSpacePolicy2.item.id),
        createFleetAgent(esClient, spaceTest1Policy1.item.id, TEST_SPACE_1),
        createFleetAgent(esClient, spaceTest1Policy2.item.id, TEST_SPACE_1),
        createFleetAgent(esClient, spaceTest1Policy1.item.id, TEST_SPACE_1),
      ]);
      defaultSpaceAgent1 = _defaultSpaceAgent1;
      defaultSpaceAgent2 = _defaultSpaceAgent2;
      testSpaceAgent1 = _testSpaceAgent1;
      testSpaceAgent2 = _testSpaceAgent2;
      testSpaceAgent3 = _testSpaceAgent3;
    }

    beforeEach(async () => {
      await cleanFleetActionIndices(esClient);
    });

    async function verifyNoAgentActions(spaceId?: string) {
      const actionStatus = await apiClient.getActionStatus(spaceId);
      expect(actionStatus.items.length).to.eql(0);
    }

    describe('GET /agents', () => {
      it('should return agents in a specific space', async () => {
        const agents = await apiClient.getAgents(TEST_SPACE_1);
        expect(agents.total).to.eql(3);
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

    describe('GET /agents/{agentId}', () => {
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

    describe('PUT /agents/{agentId}', () => {
      it('should allow updating an agent in the same space', async () => {
        await apiClient.updateAgent(testSpaceAgent1, { tags: ['foo'] }, TEST_SPACE_1);
        let agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(agent.item.tags).to.eql(['foo']);
        await apiClient.updateAgent(testSpaceAgent1, { tags: ['tag1'] }, TEST_SPACE_1);
        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(agent.item.tags).to.eql(['tag1']);
      });

      it('should not allow updating an agent from a different space', async () => {
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
      it('should allow deleting an agent in the same space', async () => {
        const testSpaceDeleteAgent = await createFleetAgent(
          esClient,
          spaceTest1Policy2.item.id,
          TEST_SPACE_1
        );
        await apiClient.deleteAgent(testSpaceDeleteAgent, TEST_SPACE_1);
        await esClient.delete({
          index: AGENTS_INDEX,
          id: testSpaceDeleteAgent,
          refresh: 'wait_for',
        });
      });

      it('should not allow deleting an agent from a different space', async () => {
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

      async function verifyAgentsTags(expected: any, spaceId?: string) {
        const agents = await apiClient.getAgents(spaceId);
        const agentTags = getAgentTags(agents);
        expect(agentTags).to.eql(expected);
      }

      it('should only update tags of agents in the same space when passing a list of agent ids', async () => {
        await verifyAgentsTags({
          [defaultSpaceAgent1]: ['tag1'],
          [defaultSpaceAgent2]: ['tag1'],
        });
        await verifyAgentsTags(
          {
            [testSpaceAgent1]: ['tag1'],
            [testSpaceAgent2]: ['tag1'],
            [testSpaceAgent3]: ['tag1'],
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        // Add tag
        await apiClient.bulkUpdateAgentTags(
          {
            agents: [defaultSpaceAgent1, testSpaceAgent1],
            tagsToAdd: ['space1'],
          },
          TEST_SPACE_1
        );

        await verifyAgentsTags({
          [defaultSpaceAgent1]: ['tag1'],
          [defaultSpaceAgent2]: ['tag1'],
        });
        await verifyAgentsTags(
          {
            [testSpaceAgent1]: ['tag1', 'space1'],
            [testSpaceAgent2]: ['tag1'],
            [testSpaceAgent3]: ['tag1'],
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        let actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);

        // Remove tag
        await apiClient.bulkUpdateAgentTags(
          {
            agents: [testSpaceAgent1],
            tagsToRemove: ['space1'],
          },
          TEST_SPACE_1
        );

        await verifyAgentsTags({
          [defaultSpaceAgent1]: ['tag1'],
          [defaultSpaceAgent2]: ['tag1'],
        });
        await verifyAgentsTags(
          {
            [testSpaceAgent1]: ['tag1'],
            [testSpaceAgent2]: ['tag1'],
            [testSpaceAgent3]: ['tag1'],
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(2);
        actionStatus.items.forEach((item) => {
          expect(item.nbAgentsActioned).to.eql(1);
          expect(item.nbAgentsActionCreated).to.eql(1);
          expect(item.type).to.eql('UPDATE_TAGS');
        });
      });

      it('should only update tags of agents in the same space when passing a kuery', async () => {
        await verifyAgentsTags({
          [defaultSpaceAgent1]: ['tag1'],
          [defaultSpaceAgent2]: ['tag1'],
        });
        await verifyAgentsTags(
          {
            [testSpaceAgent1]: ['tag1'],
            [testSpaceAgent2]: ['tag1'],
            [testSpaceAgent3]: ['tag1'],
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        // Add tag
        await apiClient.bulkUpdateAgentTags(
          {
            agents: '*',
            tagsToAdd: ['space1'],
          },
          TEST_SPACE_1
        );

        await verifyAgentsTags({
          [defaultSpaceAgent1]: ['tag1'],
          [defaultSpaceAgent2]: ['tag1'],
        });
        await verifyAgentsTags(
          {
            [testSpaceAgent1]: ['tag1', 'space1'],
            [testSpaceAgent2]: ['tag1', 'space1'],
            [testSpaceAgent3]: ['tag1', 'space1'],
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        let actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);

        // Remove tag
        await apiClient.bulkUpdateAgentTags(
          {
            agents: '',
            tagsToRemove: ['space1'],
          },
          TEST_SPACE_1
        );

        await verifyAgentsTags({
          [defaultSpaceAgent1]: ['tag1'],
          [defaultSpaceAgent2]: ['tag1'],
        });
        await verifyAgentsTags(
          {
            [testSpaceAgent1]: ['tag1'],
            [testSpaceAgent2]: ['tag1'],
            [testSpaceAgent3]: ['tag1'],
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(2);
        actionStatus.items.forEach((item) => {
          expect(item.nbAgentsActioned).to.eql(3);
          expect(item.nbAgentsActionCreated).to.eql(3);
          expect(item.type).to.eql('UPDATE_TAGS');
        });
      });
    });

    describe('POST /agents/{agentId}/upgrade', () => {
      beforeEach(async () => {
        await cleanFleetAgents(esClient);
        await createAgents();
      });

      it('should allow upgrading an agent in the same space', async () => {
        await makeAgentsUpgradeable(esClient, [testSpaceAgent1], '8.14.0');

        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.upgradeAgent(testSpaceAgent1, { version: '8.15.0' }, TEST_SPACE_1);

        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('UPGRADE');
      });

      it('should forbid upgrading an agent from a different space', async () => {
        await makeAgentsUpgradeable(esClient, [testSpaceAgent1], '8.14.0');
        const res = await supertest
          .post(`/api/fleet/agents/${testSpaceAgent1}/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({ version: '8.15.0' })
          .expect(404);
        expect(res.body.message).to.eql(`Agent ${testSpaceAgent1} not found`);
      });
    });

    describe('POST /agents/bulk_upgrade', () => {
      beforeEach(async () => {
        await cleanFleetAgents(esClient);
        await createAgents();
        await makeAgentsUpgradeable(
          esClient,
          [
            defaultSpaceAgent1,
            defaultSpaceAgent2,
            testSpaceAgent1,
            testSpaceAgent2,
            testSpaceAgent3,
          ],
          '8.14.0'
        );
      });

      function getAgentStatus(agents: GetAgentsResponse) {
        return agents.items?.reduce((acc, item) => {
          acc[item.id] = item.status;
          return acc;
        }, {} as any);
      }

      async function verifyAgentsStatus(expected: any, spaceId?: string) {
        const agents = await apiClient.getAgents(spaceId);
        const agentStatus = getAgentStatus(agents);
        expect(agentStatus).to.eql(expected);
      }

      it('should only upgrade agents in the same space when passing a list of agent ids', async () => {
        await verifyAgentsStatus({
          [defaultSpaceAgent1]: 'online',
          [defaultSpaceAgent2]: 'online',
        });
        await verifyAgentsStatus(
          {
            [testSpaceAgent1]: 'online',
            [testSpaceAgent2]: 'online',
            [testSpaceAgent3]: 'online',
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.bulkUpgradeAgents(
          {
            agents: [defaultSpaceAgent1, testSpaceAgent1],
            version: '8.15.0',
            skipRateLimitCheck: true,
          },
          TEST_SPACE_1
        );

        await verifyAgentsStatus({
          [defaultSpaceAgent1]: 'online',
          [defaultSpaceAgent2]: 'online',
        });
        await verifyAgentsStatus(
          {
            [testSpaceAgent1]: 'updating',
            [testSpaceAgent2]: 'online',
            [testSpaceAgent3]: 'online',
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('UPGRADE');
      });

      it('should only upgrade agents in the same space when passing a kuery', async () => {
        await verifyAgentsStatus({
          [defaultSpaceAgent1]: 'online',
          [defaultSpaceAgent2]: 'online',
        });
        await verifyAgentsStatus(
          {
            [testSpaceAgent1]: 'online',
            [testSpaceAgent2]: 'online',
            [testSpaceAgent3]: 'online',
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.bulkUpgradeAgents(
          {
            agents: 'status:online',
            version: '8.15.0',
            skipRateLimitCheck: true,
          },
          TEST_SPACE_1
        );

        await verifyAgentsStatus({
          [defaultSpaceAgent1]: 'online',
          [defaultSpaceAgent2]: 'online',
        });
        await verifyAgentsStatus(
          {
            [testSpaceAgent1]: 'updating',
            [testSpaceAgent2]: 'updating',
            [testSpaceAgent3]: 'updating',
          },
          TEST_SPACE_1
        );
        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(3);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(3);
        expect(actionStatus.items[0].type).to.eql('UPGRADE');
      });
    });

    describe('POST /agents/{agentId}/reassign', () => {
      it('should allow reassigning an agent in the current space to a policy in the current space', async () => {
        // Default space
        let agent = await apiClient.getAgent(defaultSpaceAgent1);
        expect(agent.item.policy_id).to.eql(defaultSpacePolicy1.item.id);
        await verifyNoAgentActions();

        await apiClient.reassignAgent(defaultSpaceAgent1, defaultSpacePolicy2.item.id);

        agent = await apiClient.getAgent(defaultSpaceAgent1);
        expect(agent.item.policy_id).to.eql(defaultSpacePolicy2.item.id);
        let actionStatus = await apiClient.getActionStatus();
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('POLICY_REASSIGN');

        // Test space
        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(agent.item.policy_id).to.eql(spaceTest1Policy1.item.id);
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.reassignAgent(testSpaceAgent1, spaceTest1Policy2.item.id, TEST_SPACE_1);

        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(agent.item.policy_id).to.eql(spaceTest1Policy2.item.id);
        actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('POLICY_REASSIGN');

        await apiClient.reassignAgent(defaultSpaceAgent1, defaultSpacePolicy1.item.id);
        await apiClient.reassignAgent(testSpaceAgent1, spaceTest1Policy1.item.id, TEST_SPACE_1);
      });

      it('should not allow reassigning an agent in a different space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.reassignAgent(testSpaceAgent1, defaultSpacePolicy2.item.id);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });

      it('should not allow reassigning an agent in the current space to a policy in a different space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.reassignAgent(defaultSpaceAgent1, spaceTest1Policy2.item.id);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });
    });

    describe('POST /agents/bulk_reassign', () => {
      function getAgentPolicyIds(agents: GetAgentsResponse) {
        return agents.items?.reduce((acc, item) => {
          acc[item.id] = item.policy_id;
          return acc;
        }, {} as any);
      }

      it('should return 404 if the policy is in another space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.bulkReassignAgents({
            agents: [defaultSpaceAgent1, testSpaceAgent1],
            policy_id: spaceTest1Policy2.item.id,
          });
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });

      it('should only reassign agents in the same space when passing a list of agent ids', async () => {
        let agent = await apiClient.getAgent(defaultSpaceAgent1);
        expect(agent.item.policy_id).to.eql(defaultSpacePolicy1.item.id);
        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(agent.item.policy_id).to.eql(spaceTest1Policy1.item.id);

        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.bulkReassignAgents(
          {
            agents: [defaultSpaceAgent1, testSpaceAgent1],
            policy_id: spaceTest1Policy2.item.id,
          },
          TEST_SPACE_1
        );

        agent = await apiClient.getAgent(defaultSpaceAgent1);
        expect(agent.item.policy_id).to.eql(defaultSpacePolicy1.item.id);
        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(agent.item.policy_id).to.eql(spaceTest1Policy2.item.id);

        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('POLICY_REASSIGN');

        await apiClient.reassignAgent(testSpaceAgent1, spaceTest1Policy1.item.id, TEST_SPACE_1);
      });

      it('should only reassign agents in the same space when passing a kuery', async () => {
        async function verifyAgentsPolicies(expected: any, spaceId?: string) {
          const agents = await apiClient.getAgents(spaceId);
          const agentPolicyIds = getAgentPolicyIds(agents);
          expect(agentPolicyIds).to.eql(expected);
        }

        await verifyAgentsPolicies({
          [defaultSpaceAgent1]: defaultSpacePolicy1.item.id,
          [defaultSpaceAgent2]: defaultSpacePolicy2.item.id,
        });
        await verifyAgentsPolicies(
          {
            [testSpaceAgent1]: spaceTest1Policy1.item.id,
            [testSpaceAgent2]: spaceTest1Policy2.item.id,
            [testSpaceAgent3]: spaceTest1Policy1.item.id,
          },
          TEST_SPACE_1
        );

        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.bulkReassignAgents(
          {
            agents: '*',
            policy_id: spaceTest1Policy2.item.id,
          },
          TEST_SPACE_1
        );

        await verifyAgentsPolicies({
          [defaultSpaceAgent1]: defaultSpacePolicy1.item.id,
          [defaultSpaceAgent2]: defaultSpacePolicy2.item.id,
        });
        await verifyAgentsPolicies(
          {
            [testSpaceAgent1]: spaceTest1Policy2.item.id,
            [testSpaceAgent2]: spaceTest1Policy2.item.id,
            [testSpaceAgent3]: spaceTest1Policy2.item.id,
          },
          TEST_SPACE_1
        );

        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(3);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(2);
        expect(actionStatus.items[0].type).to.eql('POLICY_REASSIGN');

        await apiClient.reassignAgent(testSpaceAgent1, spaceTest1Policy1.item.id, TEST_SPACE_1);
        await apiClient.reassignAgent(testSpaceAgent3, spaceTest1Policy1.item.id, TEST_SPACE_1);
      });
    });

    describe('POST /agents/{agentId}/request_diagnostics', () => {
      it('should allow requesting diagnostics for an agent in the current space', async () => {
        // Default space
        await verifyNoAgentActions();
        await apiClient.requestAgentDiagnostics(defaultSpaceAgent1);
        let actionStatus = await apiClient.getActionStatus();
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('REQUEST_DIAGNOSTICS');

        // Test space
        await verifyNoAgentActions(TEST_SPACE_1);
        await apiClient.requestAgentDiagnostics(testSpaceAgent1, TEST_SPACE_1);
        actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('REQUEST_DIAGNOSTICS');
      });

      it('should forbid requesting diagnostics for an agent a different space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.requestAgentDiagnostics(testSpaceAgent1);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });
    });

    describe('POST /agents/bulk_request_diagnostics', () => {
      it('should only request diagnostics for agents in the current space when passing a list of agent ids', async () => {
        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.bulkRequestDiagnostics(
          {
            agents: [defaultSpaceAgent1, testSpaceAgent1],
          },
          TEST_SPACE_1
        );

        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('REQUEST_DIAGNOSTICS');
      });

      it('should only request diagnostics for agents in the current space when passing a kuery', async () => {
        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.bulkRequestDiagnostics(
          {
            agents: '*',
          },
          TEST_SPACE_1
        );

        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(3);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(3);
        expect(actionStatus.items[0].type).to.eql('REQUEST_DIAGNOSTICS');
      });
    });

    describe('POST /agents/{agentId}/unenroll', () => {
      beforeEach(async () => {
        await cleanFleetAgents(esClient);
        await createAgents();
      });

      it('should allow unenrolling an agent in the current space', async () => {
        // Default space
        let agent = await apiClient.getAgent(defaultSpaceAgent1);
        expect(typeof agent.item.unenrollment_started_at).to.be('undefined');
        await verifyNoAgentActions();

        await apiClient.unenrollAgent(defaultSpaceAgent1);

        agent = await apiClient.getAgent(defaultSpaceAgent1);
        expect(typeof agent.item.unenrollment_started_at).to.eql('string');
        let actionStatus = await apiClient.getActionStatus();
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('UNENROLL');

        // Test space
        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(typeof agent.item.unenrollment_started_at).to.be('undefined');
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.unenrollAgent(testSpaceAgent1, TEST_SPACE_1);

        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(typeof agent.item.unenrollment_started_at).to.eql('string');
        actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('UNENROLL');
      });

      it('should forbid unenrolling an agent in a different space', async () => {
        let err: Error | undefined;
        try {
          await apiClient.unenrollAgent(testSpaceAgent1);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });
    });

    describe('POST /agents/bulk_unenroll', () => {
      beforeEach(async () => {
        await cleanFleetAgents(esClient);
        await createAgents();
      });

      it('should only unenroll agents in the current space when passing a list of agent ids', async () => {
        let agent = await apiClient.getAgent(defaultSpaceAgent1);
        expect(typeof agent.item.unenrollment_started_at).to.be('undefined');
        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(typeof agent.item.unenrollment_started_at).to.be('undefined');

        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.bulkUnenrollAgents(
          {
            agents: [defaultSpaceAgent1, testSpaceAgent1],
          },
          TEST_SPACE_1
        );

        agent = await apiClient.getAgent(defaultSpaceAgent1);
        expect(typeof agent.item.unenrollment_started_at).to.be('undefined');
        agent = await apiClient.getAgent(testSpaceAgent1, TEST_SPACE_1);
        expect(typeof agent.item.unenrollment_started_at).to.be('string');

        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(1);
        expect(actionStatus.items[0].type).to.eql('UNENROLL');
      });

      it('should only unenroll agents in the current space when passing a kuery', async () => {
        async function verifyAgentsUnenrollment(type: string, spaceId?: string) {
          const agents = await apiClient.getAgents(spaceId);
          agents.items.forEach((agent) => {
            expect(typeof agent.unenrollment_started_at).to.be(type);
          });
        }

        await verifyAgentsUnenrollment('undefined');
        await verifyAgentsUnenrollment('undefined', TEST_SPACE_1);
        await verifyNoAgentActions();
        await verifyNoAgentActions(TEST_SPACE_1);

        await apiClient.bulkUnenrollAgents(
          {
            agents: '*',
          },
          TEST_SPACE_1
        );

        await verifyAgentsUnenrollment('undefined');
        await verifyAgentsUnenrollment('string', TEST_SPACE_1);
        await verifyNoAgentActions();
        const actionStatus = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatus.items.length).to.eql(1);
        expect(actionStatus.items[0].nbAgentsActioned).to.eql(3);
        expect(actionStatus.items[0].nbAgentsActionCreated).to.eql(3);
        expect(actionStatus.items[0].type).to.eql('UNENROLL');
      });
    });
  });
}
