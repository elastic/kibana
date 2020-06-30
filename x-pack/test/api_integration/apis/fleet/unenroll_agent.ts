/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';

import { FtrProviderContext } from '../../ftr_provider_context';
import { setupIngest } from './agents/services';

export default function (providerContext: FtrProviderContext) {
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
        refresh: 'true',
        body: {
          doc: agentDoc,
        },
      });
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('allow to unenroll using a list of ids', async () => {
      const { body } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          force: true,
        })
        .expect(200);

      expect(body).to.have.keys('success');
      expect(body.success).to.be(true);
    });

    it('should invalidate related API keys', async () => {
      const { body } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          force: true,
        })
        .expect(200);

      expect(body).to.have.keys('success');
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
  });
}
