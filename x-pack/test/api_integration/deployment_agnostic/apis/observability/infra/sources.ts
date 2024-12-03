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
import type { SupertestWithRoleScopeType } from '../../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const SOURCE_API_URL = '/api/metrics/source';
const SOURCE_ID = 'default';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');

  describe('API /api/metrics/source', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const patchRequest = async (
      body: PartialMetricsSourceConfigurationProperties,
      expectedHttpStatusCode = 200
    ): Promise<MetricsSourceConfigurationResponse | undefined> => {
      const response = await supertestWithAdminScope
        .patch(`${SOURCE_API_URL}/${SOURCE_ID}`)
        .send(body)
        .expect(expectedHttpStatusCode);
      return response.body;
    };

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await kibanaServer.savedObjects.cleanStandardList();
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await supertestWithAdminScope.destroy();
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('PATCH /api/metrics/source/{sourceId}', () => {
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
        await patchRequest({ name: 'NAME', anomalyThreshold: -20 }, 400);

        // create config with good request
        await patchRequest({ name: 'NAME', anomalyThreshold: 20 });
        await patchRequest({ anomalyThreshold: -2 }, 400);
        await patchRequest({ anomalyThreshold: 101 }, 400);
      });
    });

    describe('GET /api/metrics/source/{sourceId}', () => {
      it('should just work', async () => {
        const { body } = await supertestWithAdminScope
          .get('/api/metrics/source/default')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body).to.have.property('source');
        expect(body?.source.configuration.metricAlias).to.equal('metrics-*,metricbeat-*');
        expect(body?.source).to.have.property('status');
        expect(body?.source.status?.metricIndicesExist).to.equal(true);
      });
    });

    describe('GET /api/metrics/source/{sourceId}/hasData', () => {
      it('should just work', async () => {
        const { body } = await supertestWithAdminScope
          .get(`/api/metrics/source/default/hasData`)

          .expect(200);

        expect(body).to.have.property('hasData');
        expect(body?.hasData).to.be(true);
      });
    });

    describe('GET /api/metrics/source/hasData', () => {
      const makeRequest = async (params?: {
        modules?: string[];
        expectedHttpStatusCode?: number;
      }) => {
        const { modules, expectedHttpStatusCode = 200 } = params ?? {};
        return supertestWithAdminScope
          .get(`${SOURCE_API_URL}/hasData`)
          .query(modules ? { modules } : '')
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
