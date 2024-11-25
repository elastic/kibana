/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import http from 'http';

import { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
import { UsageMetricsRequestBody } from '@kbn/data-usage-plugin/common/rest_types';
import { DATA_USAGE_METRICS_API_ROUTE } from '@kbn/data-usage-plugin/common';
import { transformMetricsData } from '@kbn/data-usage-plugin/server/routes/internal/usage_metrics_handler';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { setupMockServer } from '../mock_api';
import { mockAutoOpsResponse } from '../mock_data';

const now = new Date();
const to = now.toISOString(); // Current time in ISO format

const nowMinus24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const from = nowMinus24Hours.toISOString();

export default function ({ getService }: FtrProviderContext) {
  const svlDatastreamsHelpers = getService('svlDatastreamsHelpers');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScope;
  const mockAutoopsApiService = setupMockServer();
  describe('Metrics', function () {
    let mockApiServer: http.Server;
    // due to the plugin depending on yml config (xpack.dataUsage.enabled), we cannot test in MKI until it is on by default
    this.tags(['skipMKI']);

    before(async () => {
      mockApiServer = mockAutoopsApiService.listen(9000);
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    after(() => {
      mockApiServer.close();
    });
    describe(`POST ${DATA_USAGE_METRICS_API_ROUTE}`, () => {
      const testDataStreamName = 'test-data-stream';
      before(async () => await svlDatastreamsHelpers.createDataStream(testDataStreamName));
      after(async () => await svlDatastreamsHelpers.deleteDataStream(testDataStreamName));
      it('returns 400 with non-existent data streams', async () => {
        const requestBody: UsageMetricsRequestBody = {
          from,
          to,
          metricTypes: ['ingest_rate', 'storage_retained'],
          dataStreams: ['invalid-data-stream'],
        };
        const res = await supertestAdminWithCookieCredentials
          .post(DATA_USAGE_METRICS_API_ROUTE)
          .set('elastic-api-version', '1')
          .send(requestBody);
        expect(res.statusCode).to.be(400);
        expect(res.body.message).to.be('Failed to retrieve data streams');
      });

      it('returns 400 when requesting no data streams', async () => {
        const requestBody = {
          from,
          to,
          metricTypes: ['ingest_rate'],
          dataStreams: [],
        };
        const res = await supertestAdminWithCookieCredentials
          .post(DATA_USAGE_METRICS_API_ROUTE)
          .set('elastic-api-version', '1')
          .send(requestBody);
        expect(res.statusCode).to.be(400);
        expect(res.body.message).to.be('[request body.dataStreams]: no data streams selected');
      });

      it('returns 400 when requesting an invalid metric type', async () => {
        const requestBody = {
          from,
          to,
          metricTypes: [testDataStreamName],
          dataStreams: ['datastream'],
        };
        const res = await supertestAdminWithCookieCredentials
          .post(DATA_USAGE_METRICS_API_ROUTE)
          .set('elastic-api-version', '1')
          .send(requestBody);
        expect(res.statusCode).to.be(400);
        expect(res.body.message).to.be(
          '[request body.metricTypes]: must be one of ingest_rate, storage_retained, search_vcu, ingest_vcu, ml_vcu, index_latency, index_rate, search_latency, search_rate'
        );
      });

      it('returns 200 with valid request', async () => {
        const requestBody: UsageMetricsRequestBody = {
          from,
          to,
          metricTypes: ['ingest_rate', 'storage_retained'],
          dataStreams: [testDataStreamName],
        };
        const res = await supertestAdminWithCookieCredentials
          .post(DATA_USAGE_METRICS_API_ROUTE)
          .set('elastic-api-version', '1')
          .send(requestBody);
        expect(res.statusCode).to.be(200);
        expect(res.body).to.eql(transformMetricsData(mockAutoOpsResponse));
      });
    });
  });
}
