/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import expect from 'expect';
import { Readable } from 'node:stream';
import type { ApmFields, Serializable } from '@kbn/synthtrace-client';
import { serviceMap, timerange, apm, httpExitSpan } from '@kbn/synthtrace-client';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const startNumber = new Date('2025-08-12T00:00:00.000Z').getTime();
  const endNumber = new Date('2025-08-12T00:01:00.000Z').getTime();

  const start = new Date(startNumber).toISOString();
  const end = new Date(endNumber).toISOString();

  describe('Diagnostics: Service Map', () => {
    describe('without data', () => {
      it('returns empty analysis when no data exists', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/diagnostics/service-map',
          params: {
            body: {
              start,
              end,
              sourceNode: 'service-a',
              destinationNode: 'service-b',
              traceId: 'foo',
            },
          },
        });

        expect(status).toBe(200);
        expect(body.analysis.exitSpans).toEqual({
          found: false,
          totalConnections: 0,
          apmExitSpans: [],
          hasMatchingDestinationResources: false,
        });
        expect(body.analysis.parentRelationships).toEqual({
          found: false,
          documentCount: 0,
          sourceSpanIds: [],
        });
        expect(body.analysis.traceCorrelation).toBeDefined();
        expect(body.elasticsearchResponses.exitSpansQuery).toBeDefined();
        expect(body.elasticsearchResponses.sourceSpansQuery).toBeDefined();
        expect(body.elasticsearchResponses.destinationParentIdsQuery).toBeDefined();
        expect(body.analysis.traceCorrelation).toEqual({
          found: false,
          foundInSourceNode: false,
          foundInDestinationNode: false,
          sourceNodeDocumentCount: 0,
          destinationNodeDocumentCount: 0,
        });
        expect(body.elasticsearchResponses.traceCorrelationQuery).toBeDefined();
      });
    });

    describe('with data', () => {
      let synthtraceEsClient: ApmSynthtraceEsClient;

      describe('when trace is complete', () => {
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

        it('returns analysis with exit spans when complete trace exists', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/diagnostics/service-map',
            params: {
              body: {
                start,
                end,
                sourceNode: 'frontend-node',
                destinationNode: 'advertService',
              },
            },
          });

          expect(status).toBe(200);
          expect(body.analysis.exitSpans.found).toBe(true);
          expect(body.analysis.exitSpans.totalConnections).toBe(1);
          expect(body.analysis.exitSpans.hasMatchingDestinationResources).toBe(true);
          expect(body.analysis.parentRelationships.found).toBe(true);
          expect(body.analysis.parentRelationships.documentCount).toBe(1);
          expect(body.analysis.parentRelationships.sourceSpanIds.length).toBe(4);
          expect(body.elasticsearchResponses.exitSpansQuery).toBeDefined();
          expect(body.elasticsearchResponses.sourceSpansQuery).toBeDefined();
          expect(body.elasticsearchResponses.destinationParentIdsQuery).toBeDefined();
        });
      });

      describe('when the exit span does not have a span.destination.service.resource field', () => {
        let traceId: string | undefined;
        let response: {
          status: number;
          body: APIReturnType<'POST /internal/apm/diagnostics/service-map'>;
        };

        before(async () => {
          synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

          const web = apm
            .service({ name: 'web', environment: 'prod', agentName: 'rum-js' })
            .instance('my-instance');
          const proxy = apm
            .service({ name: 'frontend-proxy', environment: 'prod', agentName: 'nodejs' })
            .instance('my-instance');
          const backend = apm
            .service({ name: 'backend', environment: 'prod', agentName: 'go' })
            .instance('my-instance');

          const range = timerange(start, end).interval('10s').rate(1);

          // Create transactions with exit spans later delete the exit span destination resource
          const frontendEvents = range.generator((timestamp) =>
            web
              .transaction({ transactionName: 'Initial transaction in web' })
              .duration(400)
              .timestamp(timestamp)
              .children(
                // web -> proxy
                web
                  .span(
                    httpExitSpan({
                      spanName: 'Missing span.destination.service.resource',
                      destinationUrl: 'http://proxy:3000',
                    })
                  )
                  .duration(300)
                  .timestamp(timestamp + 10)
                  .children(
                    // procy
                    proxy
                      .transaction({ transactionName: 'Initial transaction in proxy' })
                      .duration(300)
                      .timestamp(timestamp + 20)
                  ),
                // web -> backend
                web
                  .span(
                    httpExitSpan({
                      spanName: 'GET /backend/api/products/top',
                      destinationUrl: 'http://backend:3000',
                    })
                  )
                  .duration(300)
                  .timestamp(timestamp + 10)
                  .children(
                    // backend
                    backend
                      .transaction({ transactionName: 'Initial transaction in backend' })
                      .duration(300)
                      .timestamp(timestamp + 20)
                  )
              )
          );

          const unserialized = Array.from(frontendEvents);

          const serialized = unserialized
            .flatMap((event) => event.serialize())
            .map((event) => {
              if (event['span.destination.service.resource'] === 'proxy:3000') {
                delete event['span.destination.service.resource'];
              }
              return event;
            });

          traceId = serialized.find(
            (event) => event['span.name'] === 'Missing span.destination.service.resource'
          )?.['trace.id'];

          const unserializedChanged = serialized.map((event) => ({
            fields: event,
            serialize: () => {
              return [event];
            },
          })) as Array<Serializable<ApmFields>>;

          return synthtraceEsClient.index(Readable.from([...unserializedChanged]));
        });

        after(async () => {
          await synthtraceEsClient.clean();
        });

        describe('no exit span is present', () => {
          before(async () => {
            response = await apmApiClient.readUser({
              endpoint: 'POST /internal/apm/diagnostics/service-map',
              params: {
                body: {
                  start,
                  end,
                  sourceNode: 'web',
                  destinationNode: 'frontend-proxy',
                  ...(traceId && { traceId }),
                },
              },
            });
          });

          it('returns that no exit span found', () => {
            expect(response.status).toBe(200);
            expect(response.body.analysis.exitSpans.found).toBe(false);
            expect(response.body.analysis.exitSpans.totalConnections).toBe(0);
            expect(response.body.analysis.exitSpans.apmExitSpans).toEqual([]);
            expect(response.body.analysis.exitSpans.hasMatchingDestinationResources).toBe(false);
          });

          it('detects parent relationship even when exit span is missing', () => {
            expect(response.body.analysis.parentRelationships.found).toBe(true);
            expect(response.body.analysis.parentRelationships.documentCount).toBe(1);
            expect(response.body.analysis.parentRelationships.sourceSpanIds.length).toBe(2);
          });

          it('detects trace correlation between services even without an exit span', () => {
            expect(response.body.analysis.traceCorrelation?.found).toBe(true);
            expect(response.body.analysis?.traceCorrelation?.foundInDestinationNode).toBe(true);
            expect(response.body.analysis?.traceCorrelation?.foundInSourceNode).toBe(true);
            expect(response.body.analysis?.traceCorrelation?.sourceNodeDocumentCount).toBe(3);
            expect(response.body.analysis?.traceCorrelation?.destinationNodeDocumentCount).toBe(1);
          });
        });
      });
    });
  });
}
