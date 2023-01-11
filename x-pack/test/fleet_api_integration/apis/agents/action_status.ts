/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from './services';
import { skipIfNoDockerRegistry } from '../../helpers';

const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('action_status_api', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });
    setupFleetAndAgents(providerContext);

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    describe('GET /api/fleet/agents/action_status', () => {
      before(async () => {
        await es.deleteByQuery({
          index: AGENT_ACTIONS_INDEX,
          q: '*',
        });
        try {
          await es.deleteByQuery(
            {
              index: AGENT_ACTIONS_RESULTS_INDEX,
              q: '*',
            },
            ES_INDEX_OPTIONS
          );
        } catch (error) {
          // swallowing error if does not exist
        }

        // action 2 non expired and non complete
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action2',
            agents: ['agent1', 'agent2', 'agent3'],
            '@timestamp': '2022-09-15T10:00:00.000Z',
            start_time: '2022-09-15T10:00:00.000Z',
            data: {
              version: '8.5.0',
            },
          },
        });

        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action2',
            agents: ['agent4', 'agent5'],
            '@timestamp': '2022-09-15T10:00:00.000Z',
            start_time: '2022-09-15T10:00:00.000Z',
          },
        });
        // Action 3 complete
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action3',
            agents: ['agent1', 'agent2'],
            '@timestamp': '2022-09-15T10:00:00.000Z',
            expiration: '2099-09-16T10:00:00.000Z',
          },
        });
        await es.index(
          {
            refresh: 'wait_for',
            index: AGENT_ACTIONS_RESULTS_INDEX,
            document: {
              action_id: 'action3',
              agent_id: 'agent1',
              '@timestamp': '2022-09-15T11:00:00.000Z',
            },
          },
          ES_INDEX_OPTIONS
        );
        await es.index(
          {
            refresh: 'wait_for',
            index: AGENT_ACTIONS_RESULTS_INDEX,
            document: {
              action_id: 'action3',
              agent_id: 'agent2',
              '@timestamp': '2022-09-15T12:00:00.000Z',
            },
          },
          ES_INDEX_OPTIONS
        );

        // Action 4 expired
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UNENROLL',
            action_id: 'action4',
            agents: ['agent1', 'agent2', 'agent3'],
            '@timestamp': '2022-09-15T10:00:00.000Z',
            expiration: '2022-09-14T10:00:00.000Z',
          },
        });

        // Action 5 cancelled
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action5',
            agents: ['agent1', 'agent2', 'agent3'],
            '@timestamp': '2022-09-15T10:00:00.000Z',
            start_time: '2022-09-15T10:00:00.000Z',
            expiration: '2099-09-16T10:00:00.000Z',
          },
        });
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            '@timestamp': '2022-09-15T11:00:00.000Z',
            type: 'CANCEL',
            action_id: 'cancelaction1',
            agents: ['agent1', 'agent2', 'agent3'],
            expiration: '2099-09-16T10:00:00.000Z',
            data: {
              target_id: 'action5',
            },
          },
        });

        // Action 7 failed
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'POLICY_REASSIGN',
            action_id: 'action7',
            agents: ['agent1'],
            '@timestamp': '2022-09-15T10:00:00.000Z',
            expiration: '2099-09-16T10:00:00.000Z',
            data: {
              policy_id: 'policy1',
            },
          },
        });
        await es.index(
          {
            refresh: 'wait_for',
            index: AGENT_ACTIONS_RESULTS_INDEX,
            document: {
              action_id: 'action7',
              agent_id: 'agent1',
              '@timestamp': '2022-09-15T11:00:00.000Z',
              error: 'agent already assigned',
            },
          },
          ES_INDEX_OPTIONS
        );
      });
      it('should respond 200 and the action statuses', async () => {
        const res = await supertest.get(`/api/fleet/agents/action_status`).expect(200);
        expect(res.body.items).to.eql([
          {
            actionId: 'action2',
            nbAgentsActionCreated: 5,
            nbAgentsAck: 0,
            version: '8.5.0',
            startTime: '2022-09-15T10:00:00.000Z',
            type: 'UPGRADE',
            nbAgentsActioned: 5,
            status: 'IN_PROGRESS',
            creationTime: '2022-09-15T10:00:00.000Z',
            nbAgentsFailed: 0,
          },
          {
            actionId: 'action3',
            nbAgentsActionCreated: 2,
            nbAgentsAck: 2,
            type: 'UPGRADE',
            nbAgentsActioned: 2,
            status: 'COMPLETE',
            expiration: '2099-09-16T10:00:00.000Z',
            creationTime: '2022-09-15T10:00:00.000Z',
            nbAgentsFailed: 0,
            completionTime: '2022-09-15T12:00:00.000Z',
          },
          {
            actionId: 'action4',
            nbAgentsActionCreated: 3,
            nbAgentsAck: 0,
            type: 'UNENROLL',
            nbAgentsActioned: 3,
            status: 'EXPIRED',
            expiration: '2022-09-14T10:00:00.000Z',
            creationTime: '2022-09-15T10:00:00.000Z',
            nbAgentsFailed: 0,
          },
          {
            actionId: 'action5',
            nbAgentsActionCreated: 3,
            nbAgentsAck: 0,
            startTime: '2022-09-15T10:00:00.000Z',
            type: 'UPGRADE',
            nbAgentsActioned: 3,
            status: 'CANCELLED',
            expiration: '2099-09-16T10:00:00.000Z',
            creationTime: '2022-09-15T10:00:00.000Z',
            nbAgentsFailed: 0,
            cancellationTime: '2022-09-15T11:00:00.000Z',
          },
          {
            actionId: 'action7',
            nbAgentsActionCreated: 1,
            nbAgentsAck: 0,
            type: 'POLICY_REASSIGN',
            nbAgentsActioned: 1,
            status: 'FAILED',
            expiration: '2099-09-16T10:00:00.000Z',
            newPolicyId: 'policy1',
            creationTime: '2022-09-15T10:00:00.000Z',
            nbAgentsFailed: 1,
            completionTime: '2022-09-15T11:00:00.000Z',
          },
        ]);
      });
    });
  });
}
