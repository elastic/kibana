/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from './services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('reassign agent(s)', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    beforeEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
    });
    setupFleetAndAgents(providerContext);
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('reassign single agent', () => {
      it('should allow to reassign single agent', async () => {
        await supertest
          .put(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(200);
        const { body } = await supertest.get(`/api/fleet/agents/agent1`);
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

      it('can reassign from regular agent policy to regular', async () => {
        // policy2 is not hosted
        // reassign succeeds
        await supertest
          .put(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(200);
      });

      it('cannot reassign from regular agent policy to hosted', async () => {
        // agent1 is enrolled in policy1. set policy1 to hosted
        await supertest
          .put(`/api/fleet/agent_policies/policy1`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'Test policy', namespace: 'default', is_managed: true })
          .expect(200);

        // reassign fails
        await supertest
          .put(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(400);
      });
    });

    describe('bulk reassign agents', () => {
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

      it('should allow to reassign multiple agents by id -- mix valid & invalid', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'INVALID_ID', 'agent3', 'MISSING_ID', 'etc'],
            policy_id: 'policy2',
          });

        expect(body).to.eql({
          agent2: { success: true },
          INVALID_ID: {
            success: false,
            error: 'Cannot find agent INVALID_ID',
          },
          agent3: { success: true },
          MISSING_ID: {
            success: false,
            error: 'Cannot find agent MISSING_ID',
          },
          etc: {
            success: false,
            error: 'Cannot find agent etc',
          },
        });

        const [agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`),
          supertest.get(`/api/fleet/agents/agent3`),
        ]);
        expect(agent2data.body.item.policy_id).to.eql('policy2');
        expect(agent3data.body.item.policy_id).to.eql('policy2');
      });

      it('should allow to reassign multiple agents by id -- mixed invalid, hosted, etc', async () => {
        // agent1 is enrolled in policy1. set policy1 to hosted
        await supertest
          .put(`/api/fleet/agent_policies/policy1`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'Test policy', namespace: 'default', is_managed: true })
          .expect(200);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'INVALID_ID', 'agent3'],
            policy_id: 'policy2',
          });

        expect(body).to.eql({
          agent2: {
            success: false,
            error:
              'Cannot reassign an agent from hosted agent policy policy1 in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.',
          },
          INVALID_ID: {
            success: false,
            error: 'Cannot find agent INVALID_ID',
          },
          agent3: {
            success: false,
            error:
              'Cannot reassign an agent from hosted agent policy policy1 in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.',
          },
        });

        const [agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`),
          supertest.get(`/api/fleet/agents/agent3`),
        ]);
        expect(agent2data.body.item.policy_id).to.eql('policy1');
        expect(agent3data.body.item.policy_id).to.eql('policy1');
      });

      it('should allow to reassign multiple agents by kuery', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            policy_id: 'policy2',
          })
          .expect(200);
        const { body } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
        expect(body.total).to.eql(4);
        body.items.forEach((agent: any) => {
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

      it('should return a 403 if user lacks fleet all permissions', async () => {
        await supertestWithoutAuth
          .post(`/api/fleet/agents/bulk_reassign`)
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'agent3'],
            policy_id: 'policy2',
          })
          .expect(403);
      });
    });
  });
}
