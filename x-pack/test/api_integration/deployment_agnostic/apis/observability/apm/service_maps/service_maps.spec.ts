/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import expect from 'expect';
import { serviceMap, timerange } from '@kbn/apm-synthtrace-client';
import { Readable } from 'node:stream';
import type { SupertestReturnType } from '../../../../../../apm_api_integration/common/apm_api_supertest';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

type DependencyResponse = SupertestReturnType<'GET /internal/apm/service-map/dependency'>;
type ServiceNodeResponse =
  SupertestReturnType<'GET /internal/apm/service-map/service/{serviceName}'>;

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2024-06-01T00:00:00.000Z').getTime();
  const end = new Date('2024-06-01T00:01:00.000Z').getTime();

  describe('APM Service maps', () => {
    describe('without data', () => {
      it('returns an empty list', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map`,
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: 'ENVIRONMENT_ALL',
            },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.elements.length).toBe(0);
      });

      describe('/internal/apm/service-map/service/{serviceName} without data', () => {
        let response: ServiceNodeResponse;
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/service-map/service/{serviceName}`,
            params: {
              path: { serviceName: 'opbeans-node' },
              query: {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                environment: 'ENVIRONMENT_ALL',
              },
            },
          });
        });

        it('retuns status code 200', () => {
          expect(response.status).toBe(200);
        });

        it('returns an object with nulls', async () => {
          [
            response.body.currentPeriod?.failedTransactionsRate?.value,
            response.body.currentPeriod?.memoryUsage?.value,
            response.body.currentPeriod?.cpuUsage?.value,
            response.body.currentPeriod?.transactionStats?.latency?.value,
            response.body.currentPeriod?.transactionStats?.throughput?.value,
          ].forEach((value) => {
            expect(value).toEqual(null);
          });
        });
      });

      describe('/internal/apm/service-map/dependency', () => {
        let response: DependencyResponse;
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/service-map/dependency`,
            params: {
              query: {
                dependencyName: 'postgres',
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                environment: 'ENVIRONMENT_ALL',
              },
            },
          });
        });

        it('retuns status code 200', () => {
          expect(response.status).toBe(200);
        });

        it('returns undefined values', () => {
          expect(response.body.currentPeriod).toEqual({ transactionStats: {} });
        });
      });
    });

    describe('with synthtrace data', () => {
      let synthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const events = timerange(start, end)
          .interval('10s')
          .rate(3)
          .generator(
            serviceMap({
              services: [
                { 'frontend-rum': 'rum-js' },
                { 'frontend-node': 'nodejs' },
                { advertService: 'java' },
              ],
              definePaths([rum, node, adv]) {
                return [
                  [
                    [rum, 'fetchAd'],
                    [node, 'GET /nodejs/adTag'],
                    [adv, 'APIRestController#getAd'],
                    ['elasticsearch', 'GET ad-*/_search'],
                  ],
                ];
              },
            })
          );

        return synthtraceEsClient.index(Readable.from(Array.from(events)));
      });

      after(async () => {
        await synthtraceEsClient.clean();
      });

      it('returns service map elements', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map',
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: 'ENVIRONMENT_ALL',
            },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.elements.length).toBeGreaterThan(0);
      });
    });
  });
}
