/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENT_ACTIONS_INDEX, AGENTS_INDEX, AGENT_POLICY_INDEX } from '@kbn/fleet-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('fleet_get_agents_by_actions', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');

      // Clean slate
      await es.deleteByQuery({
        index: AGENT_ACTIONS_INDEX,
        q: '*',
      });
      await es.deleteByQuery({
        index: AGENT_POLICY_INDEX,
        q: '*',
      });
      await es.deleteByQuery({
        index: AGENTS_INDEX,
        q: '*',
      });

      // Create agent actions
      await es.create({
        index: AGENT_ACTIONS_INDEX,
        refresh: 'wait_for',
        id: uuidv4(),
        body: {
          '@timestamp': '2022-09-15T10:00:00.000Z', // doesn't actually matter for theses tests
          expiration: '2022-09-15T10:00:00.000Z',
          agents: ['agent1', 'agent2'],
          action_id: 'action000001',
          data: {},
          type: 'UPGRADE',
        },
      });
      await es.create({
        index: AGENT_ACTIONS_INDEX,
        refresh: 'wait_for',
        id: uuidv4(),
        body: {
          '@timestamp': '2022-09-15T10:00:00.000Z',
          expiration: '2022-09-15T10:00:00.000Z',
          agents: ['agent3', 'agent4', 'agent5'],
          action_id: 'action000002',
          data: {},
          type: 'UNENROLL',
        },
      });
      await es.create({
        index: AGENT_ACTIONS_INDEX,
        refresh: 'wait_for',
        id: uuidv4(),
        body: {
          '@timestamp': '2022-09-15T10:00:00.000Z',
          expiration: '2022-09-15T10:00:00.000Z',
          action_id: 'action000003',
          data: {},
          type: 'UNENROLL',
        },
      });

      // Create agent policies
      await es.index({
        refresh: 'wait_for',
        index: AGENT_POLICY_INDEX,
        document: {
          revision_idx: 2,
          policy_id: 'policy1',
          coordinator_idx: 0,
          '@timestamp': '2023-03-15T13:00:00.000Z',
        },
      });

      await es.index({
        refresh: 'wait_for',
        index: AGENT_POLICY_INDEX,
        document: {
          revision_idx: 3,
          policy_id: 'policy2',
          coordinator_idx: 0,
          '@timestamp': '2023-03-15T13:00:00.000Z',
        },
      });

      // Create agents
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent1',
        document: {
          policy_id: 'policy1',
        },
      });

      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent6',
        document: {
          policy_id: 'policy1',
        },
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    describe('POST /agents/', () => {
      it('should return a list of agents corresponding to the payload action_ids (single actions id)', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['action000002'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql(['agent3', 'agent4', 'agent5']);
      });

      it('should return a list of agents corresponding to the payload action_ids (multiple actions ids)', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['action000001', 'action000002'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql(['agent1', 'agent2', 'agent3', 'agent4', 'agent5']);
      });

      it('should return a list of agents assigned to the policy if action_ids corresponds to a policy change', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['policy1:2'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql(['agent1', 'agent6']);
      });

      it('should return a list of agents for combined actions and policy changes', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['action000002', 'policy1:2', 'policy2:3'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql(['agent3', 'agent4', 'agent5', 'agent1', 'agent6']);
      });

      it('should return an empty list of agents if there are not agents on the action', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['action000003'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql([]);
      });

      it('should return an empty list of agents when action_ids are empty', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: [],
          })
          .expect(200);

        expect(apiResponse.items).to.eql([]);
      });

      it('should return an empty list of agents when action_ids do not exist', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['non_existent_action'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql([]);
      });
    });
  });
}
