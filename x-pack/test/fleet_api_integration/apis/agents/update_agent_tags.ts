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

  describe('fleet_update_agent_tags', () => {
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

    describe('bulk update agent tags', () => {
      it('should allow to bulk update tags of multiple agents by id', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent4'],
            tagsToAdd: ['newTag', 'newTag'],
            tagsToRemove: ['existingTag'],
          })
          .expect(200);
        const [agent1data, agent4data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent4`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(agent1data.body.item.tags).to.eql(['tag1', 'newTag']);
        expect(agent4data.body.item.tags).to.eql(['newTag']);
      });

      it('should not add the same tag again if it exists', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2'],
            tagsToAdd: ['existingTag'],
          })
          .expect(200);
        const [agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(agent2data.body.item.tags).to.eql(['existingTag']);
      });

      it('should allow to update tags of multiple agents by kuery', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            tagsToAdd: ['newTag'],
            tagsToRemove: ['existingTag'],
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
        expect(body.total).to.eql(4);
        body.items.forEach((agent: any) => {
          expect(agent.tags.includes('newTag')).to.be(true);
          expect(agent.tags.includes('existingTag')).to.be(false);
        });
      });

      it('should bulk update tags of multiple agents by kuery in batches', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            tagsToAdd: ['newTag'],
            tagsToRemove: ['existingTag'],
            batchSize: 2,
          })
          .expect(200);

        await new Promise((resolve, reject) => {
          setTimeout(async () => {
            const { body } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
            expect(body.total).to.eql(4);
            body.items.forEach((agent: any) => {
              expect(agent.tags.includes('newTag')).to.be(true);
              expect(agent.tags.includes('existingTag')).to.be(false);
            });
            resolve({});
          }, 2000);
        }).catch((e) => {
          throw e;
        });
      });

      it('should return a 403 if user lacks fleet all permissions', async () => {
        await supertestWithoutAuth
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'agent3'],
            tagsToAdd: ['newTag'],
            tagsToRemove: ['existingTag'],
          })
          .expect(403);
      });

      it('should not update tags of hosted agent', async () => {
        // move agent2 to policy2 to keep it regular
        await supertest.put(`/api/fleet/agents/agent2/reassign`).set('kbn-xsrf', 'xxx').send({
          policy_id: 'policy2',
        });
        // update enrolled policy to hosted
        await supertest.put(`/api/fleet/agent_policies/policy1`).set('kbn-xsrf', 'xxxx').send({
          name: 'Test policy',
          namespace: 'default',
          is_managed: true,
        });

        // attempt to update tags of agent in hosted agent policy
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            tagsToAdd: ['newTag'],
            agents: ['agent1', 'agent2'],
          })
          .expect(200);

        expect(body).to.eql({
          agent1: {
            success: false,
            error: `Cannot modify tags on a hosted agent in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.`,
          },
          agent2: { success: true },
        });

        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`),
          supertest.get(`/api/fleet/agents/agent2`),
        ]);

        expect(agent1data.body.item.tags.includes('newTag')).to.be(false);
        expect(agent2data.body.item.tags.includes('newTag')).to.be(true);
      });
    });
  });
}
