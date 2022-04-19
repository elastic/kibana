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
  const SOURCE_API_URL = '/api/metrics/source/default';
  const patchRequest = async (
    body: PartialMetricsSourceConfigurationProperties
  ): Promise<MetricsSourceConfigurationResponse | undefined> => {
    const response = await supertest
      .patch(SOURCE_API_URL)
      .set('kbn-xsrf', 'xxx')
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('sources', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
    beforeEach(() => esArchiver.load('x-pack/test/functional/es_archives/empty_kibana'));
    afterEach(() => esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana'));

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
          .patch(SOURCE_API_URL)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'NAME', anomalyThreshold: -20 })
          .expect(400);
        // create config with good request
        await supertest
          .patch(SOURCE_API_URL)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'NAME', anomalyThreshold: 20 })
          .expect(200);

        await supertest
          .patch(SOURCE_API_URL)
          .set('kbn-xsrf', 'xxx')
          .send({ anomalyThreshold: -2 })
          .expect(400);
        await supertest
          .patch(SOURCE_API_URL)
          .set('kbn-xsrf', 'xxx')
          .send({ anomalyThreshold: 101 })
          .expect(400);
      });
    });
  });
}
