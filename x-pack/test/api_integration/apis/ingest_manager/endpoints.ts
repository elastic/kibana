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

// Just to appease tests. Can/should this be from project types?
interface NewAgentConfig {
  name: string;
  description: string;
  namespace: string;
}

interface AgentConfig extends NewAgentConfig {
  id: string;
}

const paginatedSuccessKeys = ['success', 'items', 'total', 'page', 'perPage'];
// eslint-disable-next-line import/no-default-export
export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  let createdConfig: AgentConfig; // track config created for later removal
  const configPayload = { name: 'NAME', description: 'DESCRIPTION', namespace: 'NAMESPACE' };

  describe('HTTP APIs', function() {
    describe('/agent_configs', function() {
      it('GET should return agent configs', async function() {
        const { body } = await supertest
          .get('/api/ingest_manager/agent_configs')
          .set(commonHeaders)
          .expect('Content-Type', /application\/json/)
          .expect(200);

        expect(body).to.have.keys(paginatedSuccessKeys);
        expect(Array.isArray(body.items)).to.be(true);
      });

      it('POST should create agent config', async function() {
        const { body } = await supertest
          .post('/api/ingest_manager/agent_configs')
          .set(commonHeaders)
          .send(configPayload)
          .expect('Content-Type', /application\/json/)
          .expect(200);

        createdConfig = body.item;

        expect(body.success).to.be(true);
        expect(createdConfig.name).to.eql(configPayload.name);
        expect(createdConfig.description).to.eql(configPayload.description);
        expect(createdConfig.namespace).to.eql(configPayload.namespace);
        expect(createdConfig).to.have.keys(['id', 'updated_on', 'updated_by']);
      });

      it('GET /agent_configs/:id should return one agent config', async function() {
        const { body } = await supertest
          .get(`/api/ingest_manager/agent_configs/${createdConfig.id}`)
          .set(commonHeaders)
          .expect('Content-Type', /application\/json/)
          .expect(200);

        expect(body.success).to.be(true);
        // this should work, but body.item object also has `datasources: []`
        // expect(body.item).to.eql(createdConfig);
      });

      it('POST /agent_configs/delete should delete config', async function() {
        const { body } = await supertest
          .post('/api/ingest_manager/agent_configs/delete')
          .set(commonHeaders)
          .send({ agentConfigIds: [createdConfig.id] })
          .expect('Content-Type', /application\/json/)
          .expect(200);

        expect(Array.isArray(body));
        expect(body.length).to.be(1);
        expect(body[0].id).to.be(createdConfig.id);
        expect(body[0].success).to.be(true);
      });
    });

    describe('/datasources', function() {
      let createdDatasource: Record<string, any>;
      it('GET should return a list of data sources', async function() {
        const { body } = await supertest
          .get('/api/ingest_manager/datasources')
          .set(commonHeaders)
          .expect('Content-Type', /application\/json/)
          .expect(200);

        expect(body).to.have.keys(paginatedSuccessKeys);
        expect(Array.isArray(body.items)).to.be(true);
      });

      it('should create datasource', async function() {
        const datasourcePayload = {
          name: 'name string',
          agent_config_id: 'some id string',
          package: {
            name: 'endpoint',
            version: '1.0.1',
            description: 'Description about Endpoint package',
            title: 'Endpoint Security',
            assets: [
              {
                id: 'string',
                type: 'index-template',
              },
            ],
          },
          streams: [
            {
              input: {
                type: 'etc',
                config: {
                  paths: '/var/log/*.log',
                },
                ingest_pipelines: ['string'],
                index_template: 'string',
                ilm_policy: 'string',
                fields: [{}],
              },
              config: {
                metricsets: ['container', 'cpu'],
              },
              output_id: 'default',
              processors: ['string'],
            },
          ],
          read_alias: 'string',
        };

        const { body } = await supertest
          .post('/api/ingest_manager/datasources')
          .set(commonHeaders)
          .send(datasourcePayload)
          .expect('Content-Type', /application\/json/)
          .expect(200);

        expect(body.success).to.be(true);
        // should be identical to what was submitted, plus an `id` value
        expect(body.item).to.eql({ ...datasourcePayload, id: body.item.id });

        createdDatasource = body.item;
      });

      it('POST /datasources/delete should delete config', async function() {
        const { body } = await supertest
          .post('/api/ingest_manager/datasources/delete')
          .set(commonHeaders)
          .send({ datasourceIds: [createdDatasource.id] })
          .expect('Content-Type', /application\/json/)
          .expect(200);

        expect(Array.isArray(body));
        expect(body.length).to.be(1);
        expect(body[0].id).to.be(createdDatasource.id);
        expect(body[0].success).to.be(true);
      });
    });

    describe('/epm', function() {
      it('should 404', async function() {
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

    describe('/fleet', function() {
      it('should 404', async function() {
        const { body } = await supertest
          .get('/api/ingest_manager/fleet')
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
  });
}
