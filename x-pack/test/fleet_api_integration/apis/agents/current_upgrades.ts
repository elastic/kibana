/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
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

  describe('Agent current upgrades API', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });
    setupFleetAndAgents(providerContext);

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    describe('GET /api/fleet/agents/current_upgrades', () => {
      before(async () => {
        await es.deleteByQuery({
          index: AGENT_ACTIONS_INDEX,
          q: '*',
        });
        // Action 1 non expired and non complete
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action1',
            agents: ['agent1', 'agent2', 'agent3'],
            start_time: moment().toISOString(),
            expiration: moment().add(1, 'day').toISOString(),
          },
        });

        // action 2 non expired and non complete
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action2',
            agents: ['agent1', 'agent2', 'agent3'],
            start_time: moment().toISOString(),
            expiration: moment().add(1, 'day').toISOString(),
          },
        });

        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action2',
            agents: ['agent4', 'agent5'],
            start_time: moment().toISOString(),
            expiration: moment().add(1, 'day').toISOString(),
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
            start_time: moment().toISOString(),
            expiration: moment().add(1, 'day').toISOString(),
          },
        });
        await es.index(
          {
            refresh: 'wait_for',
            index: AGENT_ACTIONS_RESULTS_INDEX,
            document: {
              action_id: 'action3',
              '@timestamp': new Date().toISOString(),
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
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
              '@timestamp': new Date().toISOString(),
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            },
          },
          ES_INDEX_OPTIONS
        );

        // Action 4 expired
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action4',
            agents: ['agent1', 'agent2', 'agent3'],
            expiration: moment().subtract(1, 'day').toISOString(),
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
            start_time: moment().toISOString(),
            expiration: moment().add(1, 'day').toISOString(),
          },
        });
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'CANCEL',
            action_id: 'cancelaction1',
            agents: ['agent1', 'agent2', 'agent3'],
            expiration: moment().add(1, 'day').toISOString(),
            data: {
              target_id: 'action5',
            },
          },
        });

        // Action 6 1 agent with not start time
        await es.index({
          refresh: 'wait_for',
          index: AGENT_ACTIONS_INDEX,
          document: {
            type: 'UPGRADE',
            action_id: 'action6',
            agents: ['agent1'],
            expiration: moment().add(1, 'day').toISOString(),
          },
        });
      });
      it('should respond 200 and the current upgrades', async () => {
        const res = await supertest.get(`/api/fleet/agents/current_upgrades`).expect(200);
        const actionIds = res.body.items.map((item: any) => item.actionId);
        expect(actionIds).length(3);
        expect(actionIds).contain('action1');
        expect(actionIds).contain('action2');
        expect(actionIds).contain('action6');
      });
    });
  });
}
