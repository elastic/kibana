/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_INDEX, AGENT_POLICY_INDEX } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('fleet_agents_migrate', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
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
          is_protected: true,
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
        id: 'agent2',
        document: {
          policy_id: 'policy2', // Policy 2 is tamper protected
        },
      });
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent3',
        document: {
          policy_id: 'policy1',
          components: [
            {
              type: 'fleet-server',
              id: 'fleet-server',
              revision: 1,
            },
          ],
        },
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    describe('POST /agents/{agentId}/migrate', () => {
      it('should return a 200 if the migration action is successful', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent1/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(200);
      });

      it('should return a 500 if the agent is tamper protected', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent2/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(500);
      });

      it('should return a 500 is the agent is a fleet-agent', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent3/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(500);
      });

      it('should return a 404 when agent does not exist', async () => {
        await supertest
          .post(`/api/fleet/agents/agent100/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(404);
      });
    });
  });
}
