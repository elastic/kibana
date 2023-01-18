/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuid } from 'uuid';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from './services';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');

  describe('fleet_unenroll_agent', () => {
    skipIfNoDockerRegistry(providerContext);
    let accessAPIKeyId: string;
    let outputAPIKeyId: string;
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);
    beforeEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
      const accessAPIKeyBody = await esClient.security.createApiKey({
        body: {
          name: `test access api key: ${uuid()}`,
        },
      });
      accessAPIKeyId = accessAPIKeyBody.id;
      const outputAPIKeyBody = await esClient.security.createApiKey({
        body: {
          name: `test output api key: ${uuid()}`,
        },
      });
      outputAPIKeyId = outputAPIKeyBody.id;
      const { _source: agentDoc } = await esClient.get({
        index: '.fleet-agents',
        id: 'agent1',
      });
      // @ts-expect-error agentDoc has unknown type
      agentDoc.access_api_key_id = accessAPIKeyId;
      // @ts-expect-error agentDoc has unknown type
      agentDoc.default_api_key_id = outputAPIKeyBody.id;
      // @ts-expect-error agentDoc has unknown type
      agentDoc.default_api_key = Buffer.from(
        `${outputAPIKeyBody.id}:${outputAPIKeyBody.api_key}`
      ).toString('base64');

      await esClient.update({
        index: '.fleet-agents',
        id: 'agent1',
        refresh: true,
        body: {
          doc: agentDoc,
        },
      });
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it('/agents/{agent_id}/unenroll should fail for hosted agent policy', async () => {
      // set policy to hosted
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: true })
        .expect(200);

      await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').expect(400);
    });

    it('/agents/{agent_id}/unenroll should allow from regular agent policy', async () => {
      // set policy to regular
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: false })
        .expect(200);
      await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').expect(200);
    });

    it('/agents/{agent_id}/unenroll { revoke: true } should invalidate related API keys', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          revoke: true,
        })
        .expect(200);

      const { api_keys: accessAPIKeys } = await esClient.security.getApiKey({ id: accessAPIKeyId });
      expect(accessAPIKeys).length(1);
      expect(accessAPIKeys[0].invalidated).eql(true);

      const { api_keys: outputAPIKeys } = await esClient.security.getApiKey({ id: outputAPIKeyId });
      expect(outputAPIKeys).length(1);
      expect(outputAPIKeys[0].invalidated).eql(true);
    });

    it('/agents/bulk_unenroll should not allow unenroll from hosted agent policy', async () => {
      // set policy to hosted
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: true })
        .expect(200);

      // try to unenroll
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
        })
        // http request succeeds
        .expect(200);

      // but agents are still enrolled
      const [agent2data, agent3data] = await Promise.all([
        supertest.get(`/api/fleet/agents/agent2`),
        supertest.get(`/api/fleet/agents/agent3`),
      ]);
      expect(typeof agent2data.body.item.unenrollment_started_at).to.eql('undefined');
      expect(typeof agent2data.body.item.unenrolled_at).to.eql('undefined');
      expect(agent2data.body.item.active).to.eql(true);
      expect(typeof agent3data.body.item.unenrollment_started_at).to.be('undefined');
      expect(typeof agent3data.body.item.unenrolled_at).to.be('undefined');
      expect(agent2data.body.item.active).to.eql(true);

      const { body } = await supertest
        .get(`/api/fleet/agents/action_status`)
        .set('kbn-xsrf', 'xxx');
      const actionStatus = body.items[0];
      expect(actionStatus.status).to.eql('FAILED');
      expect(actionStatus.nbAgentsFailed).to.eql(2);
    });

    it('/agents/bulk_unenroll should allow to unenroll multiple agents by id from an regular agent policy', async () => {
      // set policy to regular
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: false })
        .expect(200);
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
        });

      const [agent2data, agent3data] = await Promise.all([
        supertest.get(`/api/fleet/agents/agent2`),
        supertest.get(`/api/fleet/agents/agent3`),
      ]);

      expect(typeof agent2data.body.item.unenrollment_started_at).to.eql('string');
      expect(agent2data.body.item.active).to.eql(true);
      expect(typeof agent3data.body.item.unenrollment_started_at).to.be('string');
      expect(agent2data.body.item.active).to.eql(true);
    });

    it('/agents/bulk_unenroll should allow to unenroll multiple agents by kuery', async () => {
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'active: true',
          revoke: true,
        })
        .expect(200);

      const { body } = await supertest.get(`/api/fleet/agents`);
      expect(body.total).to.eql(0);
    });

    it('/agents/bulk_unenroll should allow to unenroll multiple agents by kuery in batches async', async () => {
      const { body } = await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'active: true',
          revoke: false,
          batchSize: 2,
        })
        .expect(200);

      const actionId = body.actionId;

      await new Promise((resolve, reject) => {
        let attempts = 0;
        const intervalId = setInterval(async () => {
          if (attempts > 2) {
            clearInterval(intervalId);
            reject('action timed out');
          }
          ++attempts;
          const {
            body: { items: actionStatuses },
          } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');

          const action = actionStatuses?.find((a: any) => a.actionId === actionId);
          if (action && action.nbAgentsActioned === action.nbAgentsActionCreated) {
            clearInterval(intervalId);
            resolve({});
          }
        }, 1000);
      }).catch((e) => {
        throw e;
      });
    });
  });
}
