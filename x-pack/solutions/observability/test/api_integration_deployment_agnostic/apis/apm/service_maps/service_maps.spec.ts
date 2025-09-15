/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import expect from 'expect';
import { serviceMap, timerange, apm, ApmFields } from '@kbn/apm-synthtrace-client';
import { Readable } from 'node:stream';
import { compact } from 'lodash';
import type { SupertestReturnType } from '../../../../apm_api_integration/common/apm_api_supertest';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  extractExitSpansConnections,
  getElements,
  getIds,
  getSpans,
  partitionElements,
} from './utils';

type DependencyResponse = SupertestReturnType<'GET /internal/apm/service-map/dependency'>;
type ServiceNodeResponse =
  SupertestReturnType<'GET /internal/apm/service-map/service/{serviceName}'>;

function getSpanLinksFromEvents(events: ApmFields[]) {
  return compact(
    events
      .filter((event) => event['span.type'] === 'messaging')
      .map((event) => {
        const spanId = event['span.id'];
        return spanId ? { span: { id: spanId }, trace: { id: event['trace.id']! } } : undefined;
      })
  );
}

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
        expect(getElements(response).length).toBe(0);
      });

      it('returns an empty list (api v2)', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map`,
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: 'ENVIRONMENT_ALL',
              useV2: true,
            },
          },
        });

        expect(response.status).toBe(200);
        expect(getSpans(response).length).toBe(0);
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

      describe('basic scenario', () => {
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
          expect(getElements(response).length).toBeGreaterThan(0);
        });

        it('returns service map spans (api v2)', async () => {
          const response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/service-map',
            params: {
              query: {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                environment: 'ENVIRONMENT_ALL',
                useV2: true,
              },
            },
          });

          const spans = getSpans(response);
          const exitSpansConnections = extractExitSpansConnections(spans);

          expect(response.status).toBe(200);
          expect(exitSpansConnections).toEqual([
            {
              serviceName: 'advertService',
              spanDestinationServiceResource: 'elasticsearch',
            },
            {
              destinationService: {
                serviceName: 'advertService',
              },
              serviceName: 'frontend-node',
              spanDestinationServiceResource: 'advertService',
            },
            {
              destinationService: {
                serviceName: 'frontend-node',
              },
              serviceName: 'frontend-rum',
              spanDestinationServiceResource: 'frontend-node',
            },
          ]);
        });
      });

      describe('span links (api v2)', () => {
        before(async () => {
          synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

          const telemetryService = apm
            .service({ name: 'telemetryProcessor', environment: 'production', agentName: 'java' })
            .instance('instance-a');

          const notificationService = apm
            .service({ name: 'notificationConsumer', environment: 'production', agentName: 'node' })
            .instance('instance-c');

          const range = timerange(start, end).interval('10s').rate(1);

          const events = range.generator(
            serviceMap({
              services: [{ 'frontend-rum': 'rum-js' }, { 'frontend-node': 'nodejs' }],
              definePaths([rum, node]) {
                return [
                  [
                    [rum, 'telemetry'],
                    [node, 'GET /nodejs/publish'],
                    ['kafka', 'outgoing link'],
                  ],
                ];
              },
            })
          );

          const unserializedMap = Array.from(events);
          const serializedMap = unserializedMap.flatMap((event) => event.serialize());

          // outgoing link
          const telemetryEvents = range.generator((timestamp) =>
            telemetryService
              .transaction({ transactionName: 'Process telemetry' })
              .defaults({
                'span.links': getSpanLinksFromEvents(serializedMap),
              })
              .timestamp(timestamp)
              .duration(1000)
              .success()
              .children(
                telemetryService
                  .span({
                    spanName: 'incoming link',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                  })
                  .timestamp(timestamp)
                  .duration(900)
                  .success()
              )
          );

          const unserializedTelemetryEvents = Array.from(telemetryEvents);
          const serializedTelemetryEvents = unserializedTelemetryEvents.flatMap((event) =>
            event.serialize()
          );

          // incoming link
          const consumerEvents = range.generator((timestamp) =>
            notificationService
              .transaction({ transactionName: 'notify' })
              .timestamp(timestamp)
              .defaults({
                'span.links': getSpanLinksFromEvents(serializedTelemetryEvents),
              })
              .duration(1000)
              .success()
          );

          return synthtraceEsClient.index(
            Readable.from([
              ...unserializedMap,
              ...unserializedTelemetryEvents,
              ...Array.from(consumerEvents),
            ])
          );
        });

        after(async () => {
          await synthtraceEsClient.clean();
        });

        it('returns service map spans with incoming and outgoing links', async () => {
          const response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/service-map',
            params: {
              query: {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                environment: 'ENVIRONMENT_ALL',
                useV2: true,
              },
            },
          });

          const spans = getSpans(response);
          const exitSpansConnections = extractExitSpansConnections(spans);

          expect(response.status).toBe(200);
          expect(exitSpansConnections).toEqual([
            {
              destinationService: {
                serviceName: 'frontend-node',
              },
              serviceName: 'frontend-rum',
              spanDestinationServiceResource: 'frontend-node',
            },
            {
              destinationService: {
                serviceName: 'telemetryProcessor',
              },
              serviceName: 'frontend-node',
              spanDestinationServiceResource: 'outgoing link',
            },
            {
              destinationService: {
                serviceName: 'notificationConsumer',
              },
              serviceName: 'telemetryProcessor',
              spanDestinationServiceResource: 'incoming link',
            },
          ]);
        });
      });

      describe('root transaction with parent.id', () => {
        before(async () => {
          synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

          const events = timerange(start, end)
            .interval('10s')
            .rate(1)
            .generator(
              serviceMap({
                services: [{ 'frontend-rum': 'rum-js' }, { 'frontend-node': 'nodejs' }],
                definePaths([rum, node, adv]) {
                  return [
                    [
                      [rum, 'fetchAd'],
                      [node, 'GET /nodejs/adTag'],
                    ],
                  ];
                },
                rootWithParent: true,
              })
            );

          return synthtraceEsClient.index(Readable.from(Array.from(events)));
        });

        after(async () => {
          await synthtraceEsClient.clean();
        });

        it('returns service map complete path', async () => {
          const { body, status } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/service-map',
            params: {
              query: {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                environment: 'ENVIRONMENT_ALL',
              },
            },
          });

          expect(status).toBe(200);

          const { nodes, edges } = partitionElements(getElements({ body }));

          expect(getIds(nodes)).toEqual(['frontend-node', 'frontend-rum']);
          expect(getIds(edges)).toEqual(['frontend-rum~frontend-node']);
        });
      });
    });
  });
}
