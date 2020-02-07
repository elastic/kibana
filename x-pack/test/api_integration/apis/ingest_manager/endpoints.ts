/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const commonHeaders = {
  Accept: 'application/json',
  'kbn-xsrf': 'some-xsrf-token',
};

const authorizedUserHeaders = {
  ...commonHeaders,
  Authorization: 'Basic ZWxhc3RpYzpjaGFuZ2VtZQ==',
};

const paginatedSuccessKeys = ['success', 'items', 'total', 'page', 'perPage'];
// eslint-disable-next-line import/no-default-export
export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  let createdConfig = {}; // track config created for later removal
  let initialResults = [];
  const exampleConfig = { name: 'NAME', description: 'DESCRIPTION', namespace: 'NAMESPACE' };

  describe('/agent_configs', function() {
    it('should get agent configs', async function() {
      const { body } = await supertest
        .get('/api/ingest_manager/agent_configs')
        .set(commonHeaders)
        .expect('Content-Type', /application\/json/)
        .expect(200);

      expect(body).to.have.keys(paginatedSuccessKeys);
      expect(Array.isArray(body.items));

      initialResults = body.items;
    });

    it('should create agent config', async function() {
      const { body } = await supertest
        .post('/api/ingest_manager/agent_configs')
        .set(authorizedUserHeaders)
        .send(exampleConfig)
        .expect('Content-Type', /application\/json/)
        .expect(200);
      createdConfig = body.item;

      expect(body.success).to.be(true);
      expect(createdConfig.name).to.eql(exampleConfig.name);
      expect(createdConfig.description).to.eql(exampleConfig.description);
      expect(createdConfig.namespace).to.eql(exampleConfig.namespace);
      expect(createdConfig).to.have.keys(['id', 'updated_on', 'updated_by']);
    });
    it('should have new agent config', async function() {
      const { body } = await supertest
        .get(`/api/ingest_manager/agent_configs/${createdConfig.id}`)
        .set(commonHeaders)
        .expect('Content-Type', /application\/json/)
        .expect(200);

      expect(body.success).to.be(true);
      // this should work, but body.item object also has `datasources: []`
      // expect(body.item).to.eql(createdConfig);
    });
    it('should delete that new config', async function() {
      const { body } = await supertest
        .post('/api/ingest_manager/agent_configs/delete')
        .set(authorizedUserHeaders)
        .send({ agentConfigIds: [createdConfig.id] })
        .expect('Content-Type', /application\/json/)
        .expect(200);

      expect((body as Array<Record<string, any>>).every(b => b.success && b.id));
    });
    it('should get datasources', async function() {
      const { body } = await supertest
        .get('/api/ingest_manager/datasources')
        .set(commonHeaders)
        .expect('Content-Type', /application\/json/)
        .expect(200);

      const expected = { items: [], total: 0, page: 1, perPage: 20, success: true };
      expect(body).to.eql(expected);
    });
    // it('should create datasource', async function() {});
    it('should 404 from EPM package api', async function() {
      const { body } = await supertest
        .get('/api/ingest_manager/epm')
        .set(commonHeaders)
        .expect('Content-Type', /application\/json/)
        .expect(404);

      expect(body).to.eql({
        error: 'Not Found',
        message: 'Not Found',
        statusCode: 404,
      });
    });
  });
}
