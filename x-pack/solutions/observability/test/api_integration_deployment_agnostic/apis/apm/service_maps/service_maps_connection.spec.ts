/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import expect from 'expect';
import { Readable } from 'node:stream';
import { apm, serviceMap, timerange } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2024-06-01T00:00:00.000Z').getTime();
  const end = new Date('2024-06-01T00:10:00.000Z').getTime();

  const range = {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    environment: 'ENVIRONMENT_ALL',
  };

  describe('APM service map connection (request flyout)', () => {
    describe('without data', () => {
      it('returns no transactions', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map/connection/transactions',
          params: {
            query: { ...range, sourceServiceName: 'frontend-node', dependencies: ['redis'] },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ transactionGroups: [], isMaxTransactionsReached: false });
      });

      it('returns no failed calls', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map/connection/failed_calls',
          params: {
            query: { ...range, sourceServiceName: 'frontend-node', dependencies: ['redis'] },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          buckets: [],
          totalFailed: 0,
          totalCalls: 0,
          isSampled: false,
        });
      });

      it('rejects failed calls without dependencies', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map/connection/failed_calls',
          // @ts-expect-error dependencies is required
          params: { query: { ...range, sourceServiceName: 'frontend-node' } },
        });

        expect(response.status).toBe(400);
      });
    });

    describe('with a service → service → dependency chain', () => {
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

        await synthtraceEsClient.index(Readable.from(Array.from(events)));
      });

      after(async () => {
        await synthtraceEsClient.clean();
      });

      it('returns the transactions of the source that call the target service', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map/connection/transactions',
          params: {
            query: {
              ...range,
              sourceServiceName: 'frontend-node',
              targetServiceName: 'advertService',
            },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.transactionGroups.map(({ name }) => name)).toEqual([
          'GET /nodejs/adTag',
        ]);
        expect(response.body.transactionGroups[0].callCount).toBeGreaterThan(0);
        expect(response.body.isMaxTransactionsReached).toBe(false);
      });

      it('does not attribute the calls of other services to the edge', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map/connection/transactions',
          params: {
            query: {
              ...range,
              sourceServiceName: 'frontend-rum',
              targetServiceName: 'advertService',
            },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.transactionGroups).toEqual([]);
      });

      it('returns the transactions of the source that call a dependency', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map/connection/transactions',
          params: {
            query: {
              ...range,
              sourceServiceName: 'advertService',
              dependencies: ['elasticsearch'],
            },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.transactionGroups.map(({ name }) => name)).toEqual([
          'APIRestController#getAd',
        ]);
      });

      it('returns no failed call when every call succeeds', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map/connection/failed_calls',
          params: {
            query: {
              ...range,
              sourceServiceName: 'advertService',
              dependencies: ['elasticsearch'],
            },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.buckets).toEqual([]);
        expect(response.body.totalFailed).toBe(0);
        expect(response.body.totalCalls).toBeGreaterThan(0);
      });

      it('scopes the operations of a dependency to the calling service', async () => {
        const operations = (serviceName: string) =>
          apmApiClient.readUser({
            endpoint: 'GET /internal/apm/dependencies/operations',
            params: {
              query: {
                ...range,
                dependencyName: 'elasticsearch',
                serviceName,
                searchServiceDestinationMetrics: false,
                kuery: '',
              },
            },
          });

        const ofCaller = await operations('advertService');
        const ofOtherService = await operations('frontend-node');

        expect(ofCaller.status).toBe(200);
        expect(ofCaller.body.operations.map(({ spanName }) => spanName)).toEqual([
          'GET ad-*/_search',
        ]);
        expect(ofOtherService.body.operations).toEqual([]);
      });
    });

    describe('with failed calls', () => {
      let synthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const caller = apm
          .service({ name: 'checkout', environment: 'production', agentName: 'nodejs' })
          .instance('checkout-1');
        const payments = apm
          .service({ name: 'payments', environment: 'production', agentName: 'java' })
          .instance('payments-1');

        const events = timerange(start, end)
          .interval('10s')
          .rate(1)
          .generator((timestamp) => {
            const callPayments = (outcome: 'success' | 'serverError' | 'neverArrives') => {
              const exitSpan = caller
                .span({ spanName: 'POST /pay', spanType: 'external', spanSubtype: 'http' })
                .destination('payments')
                .timestamp(timestamp + 1)
                .duration(100);

              if (outcome === 'success') {
                return exitSpan.success().children(
                  payments
                    .transaction({ transactionName: 'POST /pay' })
                    .timestamp(timestamp + 2)
                    .duration(80)
                    .success()
                );
              }

              if (outcome === 'serverError') {
                return exitSpan.failure().children(
                  payments
                    .transaction({ transactionName: 'POST /pay' })
                    .timestamp(timestamp + 2)
                    .duration(80)
                    .failure()
                    .errors(
                      payments
                        .error({ message: 'Card processor unavailable', type: 'ProcessorError' })
                        .timestamp(timestamp + 3)
                    )
                );
              }

              return exitSpan.failure();
            };

            return (['success', 'serverError', 'neverArrives'] as const).map((outcome) =>
              caller
                .transaction({ transactionName: 'POST /checkout' })
                .timestamp(timestamp)
                .duration(200)
                .children(callPayments(outcome))
            );
          });

        await synthtraceEsClient.index(Readable.from(Array.from(events)));
      });

      after(async () => {
        await synthtraceEsClient.clean();
      });

      it('splits the failed calls by where they failed', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/service-map/connection/failed_calls',
          params: {
            query: {
              ...range,
              sourceServiceName: 'checkout',
              targetServiceName: 'payments',
              dependencies: ['payments'],
            },
          },
        });

        expect(response.status).toBe(200);

        const { buckets, totalFailed, totalCalls, isSampled } = response.body;
        const byType = Object.fromEntries(buckets.map((bucket) => [bucket.type, bucket]));

        expect(byType.caller.count).toBeGreaterThan(0);
        expect(byType.server.count).toBeGreaterThan(0);
        expect(byType.client.count).toBe(0);
        expect(byType.server.topError).toBe('Card processor unavailable');
        expect(byType.server.topErrorGroupId).not.toBeNull();
        expect(totalFailed).toBe(byType.caller.count + byType.server.count);
        // every round makes three calls to payments and two of them fail
        expect(totalCalls).toBe((totalFailed * 3) / 2);
        expect(isSampled).toBe(false);
      });
    });
  });
}
