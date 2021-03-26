/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';

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
      await esArchiver.load('fleet/agents');
    });
    setupFleetAndAgents(providerContext);
    beforeEach(async () => {
      const { body: accessAPIKeyBody } = await esClient.security.createApiKey({
        body: {
          name: `test access api key: ${uuid.v4()}`,
        },
      });
      accessAPIKeyId = accessAPIKeyBody.id;
      const { body: outputAPIKeyBody } = await esClient.security.createApiKey({
        body: {
          name: `test output api key: ${uuid.v4()}`,
        },
      });
      outputAPIKeyId = outputAPIKeyBody.id;
      const {
        body: { _source: agentDoc },
      } = await esClient.get({
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
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('/agents/{agent_id}/unenroll should fail for managed policy', async () => {
      // set policy to managed
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: true })
        .expect(200);

      await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').expect(400);
    });

    it('/agents/{agent_id}/unenroll should allow from unmanaged policy', async () => {
      // set policy to unmanaged
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: false })
        .expect(200);
      await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').expect(200);
    });

    it('/agents/{agent_id}/unenroll { force: true } should invalidate related API keys', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          force: true,
        })
        .expect(200);

      const {
        body: { api_keys: accessAPIKeys },
      } = await esClient.security.getApiKey({ id: accessAPIKeyId });
      expect(accessAPIKeys).length(1);
      expect(accessAPIKeys[0].invalidated).eql(true);

      const {
        body: { api_keys: outputAPIKeys },
      } = await esClient.security.getApiKey({ id: outputAPIKeyId });
      expect(outputAPIKeys).length(1);
      expect(outputAPIKeys[0].invalidated).eql(true);
    });

    it('/agents/{agent_id}/bulk_unenroll should not allow unenroll from managed policy', async () => {
      // set policy to managed
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: true })
        .expect(200);

      // try to unenroll
      const { body: unenrolledBody } = await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
        })
        // http request succeeds
        .expect(200);

      expect(unenrolledBody).to.eql({
        agent2: {
          success: false,
          error: 'Cannot unenroll agent2 from a managed agent policy policy1',
        },
        agent3: {
          success: false,
          error: 'Cannot unenroll agent3 from a managed agent policy policy1',
        },
      });
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
    });

    it('/agents/{agent_id}/bulk_unenroll should allow to unenroll multiple agents by id from an unmanaged policy', async () => {
      // set policy to unmanaged
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: false })
        .expect(200);
      const { body: unenrolledBody } = await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
        });

      expect(unenrolledBody).to.eql({
        agent2: { success: true },
        agent3: { success: true },
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

    it('/agents/{agent_id}/bulk_unenroll should allow to unenroll multiple agents by kuery', async () => {
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'fleet-agents.active: true',
          force: true,
        })
        .expect(200);

      const { body } = await supertest.get(`/api/fleet/agents`);
      expect(body.total).to.eql(0);
    });
  });
}
