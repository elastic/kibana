/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InfraSynthtraceEsClient } from '@kbn/synthtrace';
import { infra, timerange } from '@kbn/synthtrace-client';
import type {
  MetricsSourceConfigurationResponse,
  PartialMetricsSourceConfigurationProperties,
} from '@kbn/infra-plugin/common/metrics_sources';
import { metricsSourceConfigurationResponseRT } from '@kbn/infra-plugin/common/metrics_sources';
import type { SupertestWithRoleScopeType } from '../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

const SOURCE_API_URL = '/api/metrics/source';
const SOURCE_ID = 'default';

function generateMetricsData({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      infra.host('demo-host-1').cpu({ 'system.cpu.total.norm.pct': 0.5 }).timestamp(timestamp),
      infra.host('demo-host-1').memory().timestamp(timestamp),
      infra.host('demo-host-1').network().timestamp(timestamp),
      infra.host('demo-host-2').cpu({ 'system.cpu.total.norm.pct': 0.3 }).timestamp(timestamp),
      infra.host('demo-host-2').memory().timestamp(timestamp),
      infra.host('demo-host-2').network().timestamp(timestamp),
    ]);
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  const synthtrace = getService('synthtrace');

  describe('API /api/metrics/source', function () {
    let supertestWithAdminScope: SupertestWithRoleScopeType;
    let synthtraceClient: InfraSynthtraceEsClient;

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

    const from = new Date(Date.now() - 1000 * 60 * 10).toISOString(); // 10 minutes ago
    const to = new Date().toISOString();

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });

      synthtraceClient = synthtrace.createInfraSynthtraceEsClient();

      await synthtraceClient.clean();
      await synthtraceClient.index(generateMetricsData({ from, to }));
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await synthtraceClient.clean();
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
          metricAlias: 'metrics-*',
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
        expect(configuration?.metricAlias).to.be('metrics-*');
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
          metricAlias: 'metrics-*',
        });

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;
        const status = updateResponse?.source.status;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt || 0);
        expect(configuration?.metricAlias).to.be('metrics-*');
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

      before(async () => {
        await patchRequest({ name: 'default', metricAlias: 'metrics-*,metricbeat-*' });
      });

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
    });
  });
}
