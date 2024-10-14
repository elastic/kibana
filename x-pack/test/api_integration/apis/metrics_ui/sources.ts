/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  MetricsSourceConfigurationResponse,
  PartialMetricsSourceConfigurationProperties,
  metricsSourceConfigurationResponseRT,
} from '@kbn/infra-plugin/common/metrics_sources';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const SOURCE_API_URL = '/api/metrics/source';
  const SOURCE_ID = 'default';
  const kibanaServer = getService('kibanaServer');

  describe('sources', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await kibanaServer.savedObjects.cleanStandardList();
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    const patchRequest = async (
      body: PartialMetricsSourceConfigurationProperties
    ): Promise<MetricsSourceConfigurationResponse | undefined> => {
      const response = await supertest
        .patch(`${SOURCE_API_URL}/${SOURCE_ID}`)
        .set('kbn-xsrf', 'xxx')
        .send(body)
        .expect(200);
      return response.body;
    };

    describe('patch request', () => {
      it('applies all top-level field updates to an existing source', async () => {
        const creationResponse = await patchRequest({
          name: 'NAME',
        });

        const initialVersion = creationResponse?.source.version;
        const createdAt = creationResponse?.source.updatedAt;

        expect(initialVersion).to.be.a('string');
        expect(createdAt).to.be.greaterThan(0);

        const updateResponse = await patchRequest({
          name: 'UPDATED_NAME',
          description: 'UPDATED_DESCRIPTION',
          metricAlias: 'metricbeat-**',
        });

        expect(metricsSourceConfigurationResponseRT.is(updateResponse)).to.be(true);

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;
        const status = updateResponse?.source.status;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt || 0);
        expect(configuration?.name).to.be('UPDATED_NAME');
        expect(configuration?.description).to.be('UPDATED_DESCRIPTION');
        expect(configuration?.metricAlias).to.be('metricbeat-**');
        expect(configuration?.anomalyThreshold).to.be(50);
        expect(status?.metricIndicesExist).to.be(true);
      });

      it('applies a single top-level update to an existing source', async () => {
        const creationResponse = await patchRequest({
          name: 'NAME',
        });

        const initialVersion = creationResponse?.source.version;
        const createdAt = creationResponse?.source.updatedAt;

        expect(initialVersion).to.be.a('string');
        expect(createdAt).to.be.greaterThan(0);

        const updateResponse = await patchRequest({
          name: 'UPDATED_NAME',
          description: 'UPDATED_DESCRIPTION',
          metricAlias: 'metricbeat-**',
        });

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;
        const status = updateResponse?.source.status;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt || 0);
        expect(configuration?.metricAlias).to.be('metricbeat-**');
        expect(status?.metricIndicesExist).to.be(true);
      });

      it('validates anomalyThreshold is between range 1-100', async () => {
        // create config with bad request
        await supertest
          .patch(`${SOURCE_API_URL}/${SOURCE_ID}`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'NAME', anomalyThreshold: -20 })
          .expect(400);
        // create config with good request
        await supertest
          .patch(`${SOURCE_API_URL}/${SOURCE_ID}`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'NAME', anomalyThreshold: 20 })
          .expect(200);

        await supertest
          .patch(`${SOURCE_API_URL}/${SOURCE_ID}`)
          .set('kbn-xsrf', 'xxx')
          .send({ anomalyThreshold: -2 })
          .expect(400);
        await supertest
          .patch(`${SOURCE_API_URL}/${SOURCE_ID}`)
          .set('kbn-xsrf', 'xxx')
          .send({ anomalyThreshold: 101 })
          .expect(400);
      });
    });

    describe('has data', () => {
      const makeRequest = async (params?: {
        modules?: string[];
        expectedHttpStatusCode?: number;
      }) => {
        const { modules, expectedHttpStatusCode = 200 } = params ?? {};
        return supertest
          .get(`${SOURCE_API_URL}/hasData`)
          .query(modules ? { modules } : '')
          .set('kbn-xsrf', 'xxx')
          .expect(expectedHttpStatusCode);
      };

      before(() => patchRequest({ name: 'default', metricAlias: 'metrics-*,metricbeat-*' }));

      it('should return "hasData" true when modules is "system"', async () => {
        const response = await makeRequest({ modules: ['system'] });
        expect(response.body.hasData).to.be(true);
      });
      it('should return "hasData" false when modules is "nginx"', async () => {
        const response = await makeRequest({ modules: ['nginx'] });
        expect(response.body.hasData).to.be(true);
      });

      it('should return "hasData" true when modules is not passed', async () => {
        const response = await makeRequest();
        expect(response.body.hasData).to.be(true);
      });

      it('should fail when "modules" size is greater than 5', async () => {
        await makeRequest({
          modules: ['system', 'nginx', 'kubernetes', 'aws', 'kafka', 'azure'],
          expectedHttpStatusCode: 400,
        });
      });
    });
  });
}
