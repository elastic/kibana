/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      await esArchiver.loadIfNeeded('fleet/agents');
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
        index: '.kibana',
        id: 'fleet-agents:agent1',
      });
      // @ts-ignore
      agentDoc['fleet-agents'].access_api_key_id = accessAPIKeyId;
      agentDoc['fleet-agents'].default_api_key_id = outputAPIKeyBody.id;
      agentDoc['fleet-agents'].default_api_key = Buffer.from(
        `${outputAPIKeyBody.id}:${outputAPIKeyBody.api_key}`
      ).toString('base64');

      await esClient.update({
        index: '.kibana',
        id: 'fleet-agents:agent1',
        refresh: true,
        body: {
          doc: agentDoc,
        },
      });
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should allow to unenroll single agent', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          force: true,
        })
        .expect(200);
    });

    it('should invalidate related API keys', async () => {
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

    it('should allow to unenroll multiple agents by id', async () => {
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
        })
        .expect(200);
      const [agent2data, agent3data] = await Promise.all([
        supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        supertest.get(`/api/fleet/agents/agent3`).set('kbn-xsrf', 'xxx'),
      ]);
      expect(typeof agent2data.body.item.unenrollment_started_at).to.eql('string');
      expect(agent2data.body.item.active).to.eql(true);
      expect(typeof agent3data.body.item.unenrollment_started_at).to.be('string');
      expect(agent2data.body.item.active).to.eql(true);
    });

    it('should allow to unenroll multiple agents by kuery', async () => {
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'fleet-agents.active: true',
          force: true,
        })
        .expect(200);

      const { body } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
      expect(body.total).to.eql(0);
    });
  });
}
