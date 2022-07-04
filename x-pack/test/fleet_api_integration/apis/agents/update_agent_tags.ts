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
        const { body: updatedBody } = await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            tagsToAdd: ['newTag'],
            tagsToRemove: ['existingTag'],
            batchSize: 2,
          })
          .expect(200);

        expect(updatedBody).to.eql({
          agent1: { success: true },
          agent2: { success: true },
          agent3: { success: true },
          agent4: { success: true },
        });

        const { body } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
        expect(body.total).to.eql(4);
        body.items.forEach((agent: any) => {
          expect(agent.tags.includes('newTag')).to.be(true);
          expect(agent.tags.includes('existingTag')).to.be(false);
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
    });
  });
}
