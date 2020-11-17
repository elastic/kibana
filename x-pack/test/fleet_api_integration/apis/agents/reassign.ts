/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from './services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_reassign_agent', () => {
    setupFleetAndAgents(providerContext);
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should allow to reassign single agent', async () => {
      await supertest
        .put(`/api/fleet/agents/agent1/reassign`)
        .set('kbn-xsrf', 'xxx')
        .send({
          policy_id: 'policy2',
        })
        .expect(200);
      const { body } = await supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx');
      expect(body.item.policy_id).to.eql('policy2');
    });

    it('should throw an error for invalid policy id for single reassign', async () => {
      await supertest
        .put(`/api/fleet/agents/agent1/reassign`)
        .set('kbn-xsrf', 'xxx')
        .send({
          policy_id: 'INVALID_ID',
        })
        .expect(404);
    });

    it('should allow to reassign multiple agents by id', async () => {
      await supertest
        .post(`/api/fleet/agents/bulk_reassign`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
          policy_id: 'policy2',
        })
        .expect(200);
      const [agent2data, agent3data] = await Promise.all([
        supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        supertest.get(`/api/fleet/agents/agent3`).set('kbn-xsrf', 'xxx'),
      ]);
      expect(agent2data.body.item.policy_id).to.eql('policy2');
      expect(agent3data.body.item.policy_id).to.eql('policy2');
    });

    it('should allow to reassign multiple agents by kuery', async () => {
      await supertest
        .post(`/api/fleet/agents/bulk_reassign`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'fleet-agents.active: true',
          policy_id: 'policy2',
        })
        .expect(200);
      const { body } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
      expect(body.total).to.eql(4);
      body.list.forEach((agent: any) => {
        expect(agent.policy_id).to.eql('policy2');
      });
    });

    it('should throw an error for invalid policy id for bulk reassign', async () => {
      await supertest
        .post(`/api/fleet/agents/bulk_reassign`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
          policy_id: 'INVALID_ID',
        })
        .expect(404);
    });
  });
}
