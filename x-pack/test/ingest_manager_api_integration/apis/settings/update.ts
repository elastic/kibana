/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('Settings - update', async function () {
    skipIfNoDockerRegistry(providerContext);

    it("should bump all agent policy's revision", async function () {
      const { body: testPolicy1PostRes } = await supertest
        .post(`/api/ingest_manager/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'test',
          description: '',
          namespace: 'default',
        });
      const { body: testPolicy2PostRes } = await supertest
        .post(`/api/ingest_manager/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'test2',
          description: '',
          namespace: 'default',
        });
      await supertest
        .put(`/api/ingest_manager/settings`)
        .set('kbn-xsrf', 'xxxx')
        .send({ kibana_urls: ['http://localhost:1232/abc', 'http://localhost:1232/abc'] });

      const getTestPolicy1Res = await kibanaServer.savedObjects.get({
        type: 'ingest-agent-policies',
        id: testPolicy1PostRes.item.id,
      });
      const getTestPolicy2Res = await kibanaServer.savedObjects.get({
        type: 'ingest-agent-policies',
        id: testPolicy2PostRes.item.id,
      });
      expect(getTestPolicy1Res.attributes.revision).equal(2);
      expect(getTestPolicy2Res.attributes.revision).equal(2);
    });
  });
}
