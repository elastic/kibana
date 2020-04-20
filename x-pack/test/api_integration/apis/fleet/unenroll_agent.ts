/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';

import { FtrProviderContext } from '../../ftr_provider_context';
import { setupIngest } from './agents/services';

export default function(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');

  describe('fleet_unenroll_agent', () => {
    let accessAPIKeyId: string;
    let outputAPIKeyId: string;
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    setupIngest(providerContext);
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
        id: 'agents:agent1',
      });
      // @ts-ignore
      agentDoc.agents.access_api_key_id = accessAPIKeyId;
      agentDoc.agents.default_api_key_id = outputAPIKeyBody.id;
      agentDoc.agents.default_api_key = Buffer.from(
        `${outputAPIKeyBody.id}:${outputAPIKeyBody.api_key}`
      ).toString('base64');

      await esClient.update({
        index: '.kibana',
        id: 'agents:agent1',
        refresh: 'true',
        body: {
          doc: agentDoc,
        },
      });
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should not allow both ids and kuery in the payload', async () => {
      await supertest
        .post(`/api/ingest_manager/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          ids: ['agent:1'],
          kuery: ['agents.id:1'],
        })
        .expect(400);
    });

    it('should not allow no ids or kuery in the payload', async () => {
      await supertest
        .post(`/api/ingest_manager/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({})
        .expect(400);
    });

    it('allow to unenroll using a list of ids', async () => {
      const { body } = await supertest
        .post(`/api/ingest_manager/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          ids: ['agent1'],
        })
        .expect(200);

      expect(body).to.have.keys('results', 'success');
      expect(body.success).to.be(true);
      expect(body.results).to.have.length(1);
      expect(body.results[0].success).to.be(true);
    });

    it('should invalidate related API keys', async () => {
      const { body } = await supertest
        .post(`/api/ingest_manager/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          ids: ['agent1'],
        })
        .expect(200);

      expect(body).to.have.keys('results', 'success');
      expect(body.success).to.be(true);

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

    it('allow to unenroll using a kibana query', async () => {
      const { body } = await supertest
        .post(`/api/ingest_manager/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          kuery: 'agents.shared_id:agent2_filebeat OR agents.shared_id:agent3_metricbeat',
        })
        .expect(200);

      expect(body).to.have.keys('results', 'success');
      expect(body.success).to.be(true);
      expect(body.results).to.have.length(2);
      expect(body.results[0].success).to.be(true);

      const agentsUnenrolledIds = body.results.map((r: { id: string }) => r.id);

      expect(agentsUnenrolledIds).to.contain('agent2');
      expect(agentsUnenrolledIds).to.contain('agent3');
    });
  });
}
