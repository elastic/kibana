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
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createProxyServer } from './proxy_server';

const API_PATH = '/internal/api/data_usage/metrics';
export default function ({ getService }: FtrProviderContext) {
  const svlDatastreamsHelpers = getService('svlDatastreamsHelpers');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const log = getService('log');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScope;
  describe('Metrics', function () {
    // proxy does not work with MKI
    this.tags(['skipMKI']);
    let proxyServer: http.Server;

    before(async () => {
      proxyServer = createProxyServer(9000, log);
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    after(() => {
      proxyServer.close();
    });
    describe(`POST ${API_PATH}`, () => {
      const testDataStreamName = 'test-data-stream';
      before(async () => await svlDatastreamsHelpers.createDataStream(testDataStreamName));
      after(async () => await svlDatastreamsHelpers.deleteDataStream(testDataStreamName));
      it('returns 500 with non-existent data streams', async () => {
        const requestBody: UsageMetricsRequestBody = {
          from: 'now-24h/h',
          to: 'now',
          metricTypes: ['ingest_rate', 'storage_retained'],
          dataStreams: ['invalid-data-stream'],
        };
        const res = await supertestAdminWithCookieCredentials
          .post(API_PATH)
          .set('elastic-api-version', '1')
          .send(requestBody);
        expect(res.statusCode).to.be(500);
      });

      it('returns 200 with valid request', async () => {
        const requestBody: UsageMetricsRequestBody = {
          from: 'now-24h/h',
          to: 'now',
          metricTypes: ['ingest_rate', 'storage_retained'],
          dataStreams: [testDataStreamName],
        };
        const res = await supertestAdminWithCookieCredentials
          .post(API_PATH)
          .set('elastic-api-version', '1')
          .send(requestBody);
        expect(res.statusCode).to.be(200);
        // TODO: decide on how to generate data
        expect(res.body).to.eql({
          metrics: {
            ingest_rate: [
              {
                data: [
                  {
                    x: 1726858530000,
                    y: 13756849,
                  },
                  {
                    x: 1726862130000,
                    y: 14657904,
                  },
                ],
                name: 'metrics-system.cpu-default',
              },
              {
                data: [
                  {
                    x: 1726858530000,
                    y: 12894623,
                  },
                  {
                    x: 1726862130000,
                    y: 14436905,
                  },
                ],
                name: 'logs-nginx.access-default',
              },
            ],
            storage_retained: [
              {
                data: [
                  {
                    x: 1726858530000,
                    y: 12576413,
                  },
                  {
                    x: 1726862130000,
                    y: 13956423,
                  },
                ],
                name: 'metrics-system.cpu-default',
              },
              {
                data: [
                  {
                    x: 1726858530000,
                    y: 12894623,
                  },
                  {
                    x: 1726862130000,
                    y: 14436905,
                  },
                ],
                name: 'logs-nginx.access-default',
              },
            ],
          },
        });
      });
    });
  });
}
