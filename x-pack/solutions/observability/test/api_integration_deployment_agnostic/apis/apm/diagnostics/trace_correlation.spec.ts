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
import { timerange, apm, httpExitSpan } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const startNumber = new Date('2025-08-12T00:00:00.000Z').getTime();
  const endNumber = new Date('2025-08-12T00:01:00.000Z').getTime();

  const start = new Date(startNumber).toISOString();
  const end = new Date(endNumber).toISOString();

  describe('Diagnostics: Trace Correlation', () => {
    describe('without data', () => {
      it('returns empty trace correlation when no data exists', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/diagnostics/service-map',
          params: {
            body: {
              start,
              end,
              sourceNode: 'service-a',
              destinationNode: 'service-b',
              traceId: 'non-existent-trace-id',
            },
          },
        });

        expect(status).toBe(200);
        expect(body.analysis.traceCorrelation).toEqual({
          found: false,
          foundInSourceNode: false,
          foundInDestinationNode: false,
          sourceNodeDocumentCount: 0,
          destinationNodeDocumentCount: 0,
        });
        expect(body.elasticsearchResponses.traceCorrelationQuery).toBeDefined();
      });

      it('does not return trace correlation when traceId is not provided', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/diagnostics/service-map',
          params: {
            body: {
              start,
              end,
              sourceNode: 'service-a',
              destinationNode: 'service-b',
            },
          },
        });

        expect(status).toBe(200);
        expect(body.analysis.traceCorrelation).toBeUndefined();
        expect(body.elasticsearchResponses.traceCorrelationQuery).toBeUndefined();
      });
    });

    describe('with data', () => {
      let synthtraceEsClient: ApmSynthtraceEsClient;

      describe('when trace exists in both source and destination nodes', () => {
        let traceId: string | undefined;

        before(async () => {
          synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

          const sourceService = apm
            .service({ name: 'source-service', environment: 'prod', agentName: 'nodejs' })
            .instance('source-instance');
          const destinationService = apm
            .service({ name: 'destination-service', environment: 'prod', agentName: 'go' })
            .instance('destination-instance');

          const range = timerange(start, end).interval('10s').rate(1);

          const events = range.generator((timestamp) =>
            sourceService
              .transaction({ transactionName: 'GET /api/data' })
              .duration(400)
              .timestamp(timestamp)
              .children(
                sourceService
                  .span(
                    httpExitSpan({
                      spanName: 'GET /destination/endpoint',
                      destinationUrl: 'http://destination-service:3000',
                    })
                  )
                  .duration(300)
                  .timestamp(timestamp + 10)
                  .children(
                    destinationService
                      .transaction({ transactionName: 'GET /destination/endpoint' })
                      .duration(200)
                      .timestamp(timestamp + 20)
                  )
              )
          );

          const unserialized = Array.from(events);
          const serialized = unserialized.flatMap((event) => event.serialize());

          traceId = serialized.find(
            (event) => event['service.name'] === 'source-service' && event['trace.id']
          )?.['trace.id'];

          const unserializedChanged = serialized.map((event) => ({
            fields: event,
            serialize: () => [event],
          })) as Array<Serializable<ApmFields>>;

          return synthtraceEsClient.index(Readable.from([...unserializedChanged]));
        });

        after(async () => {
          await synthtraceEsClient.clean();
        });

        it('returns trace correlation found in both nodes', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/diagnostics/service-map',
            params: {
              body: {
                start,
                end,
                sourceNode: 'source-service',
                destinationNode: 'destination-service',
                ...(traceId && { traceId }),
              },
            },
          });

          expect(status).toBe(200);
          expect(body.analysis.traceCorrelation?.found).toBe(true);
          expect(body.analysis.traceCorrelation?.foundInSourceNode).toBe(true);
          expect(body.analysis.traceCorrelation?.foundInDestinationNode).toBe(true);
          expect(body.analysis.traceCorrelation?.sourceNodeDocumentCount).toBeGreaterThan(0);
          expect(body.analysis.traceCorrelation?.destinationNodeDocumentCount).toBeGreaterThan(0);
          expect(body.elasticsearchResponses.traceCorrelationQuery).toBeDefined();
        });

        it('returns trace correlation not found with non-existent trace ID', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/diagnostics/service-map',
            params: {
              body: {
                start,
                end,
                sourceNode: 'source-service',
                destinationNode: 'destination-service',
                traceId: 'non-existent-trace-id-12345',
              },
            },
          });

          expect(status).toBe(200);
          expect(body.analysis.traceCorrelation?.found).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInSourceNode).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInDestinationNode).toBe(false);
          expect(body.analysis.traceCorrelation?.sourceNodeDocumentCount).toBe(0);
          expect(body.analysis.traceCorrelation?.destinationNodeDocumentCount).toBe(0);
        });
      });

      describe('when trace exists only in source node', () => {
        let sourceOnlyTraceId: string | undefined;

        before(async () => {
          synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

          const sourceService = apm
            .service({ name: 'source-only-service', environment: 'prod', agentName: 'nodejs' })
            .instance('source-only-instance');

          const range = timerange(start, end).interval('10s').rate(1);

          // Create transactions only in the source service (no downstream calls)
          const events = range.generator((timestamp) =>
            sourceService
              .transaction({ transactionName: 'GET /internal/data' })
              .duration(100)
              .timestamp(timestamp)
          );

          const unserialized = Array.from(events);
          const serialized = unserialized.flatMap((event) => event.serialize());

          sourceOnlyTraceId = serialized.find(
            (event) => event['service.name'] === 'source-only-service' && event['trace.id']
          )?.['trace.id'];

          const unserializedChanged = serialized.map((event) => ({
            fields: event,
            serialize: () => [event],
          })) as Array<Serializable<ApmFields>>;

          return synthtraceEsClient.index(Readable.from([...unserializedChanged]));
        });

        after(async () => {
          await synthtraceEsClient.clean();
        });

        it('returns trace correlation found only in source node', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/diagnostics/service-map',
            params: {
              body: {
                start,
                end,
                sourceNode: 'source-only-service',
                destinationNode: 'non-existent-destination',
                ...(sourceOnlyTraceId && { traceId: sourceOnlyTraceId }),
              },
            },
          });

          expect(status).toBe(200);
          expect(body.analysis.traceCorrelation?.found).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInSourceNode).toBe(true);
          expect(body.analysis.traceCorrelation?.foundInDestinationNode).toBe(false);
          expect(body.analysis.traceCorrelation?.sourceNodeDocumentCount).toBeGreaterThan(0);
          expect(body.analysis.traceCorrelation?.destinationNodeDocumentCount).toBe(0);
        });
      });

      describe('when trace exists only in destination node', () => {
        let destinationOnlyTraceId: string | undefined;

        before(async () => {
          synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

          const destinationService = apm
            .service({
              name: 'destination-only-service',
              environment: 'prod',
              agentName: 'go',
            })
            .instance('destination-only-instance');

          const range = timerange(start, end).interval('10s').rate(1);

          // Create transactions only in the destination service
          const events = range.generator((timestamp) =>
            destinationService
              .transaction({ transactionName: 'GET /destination/process' })
              .duration(100)
              .timestamp(timestamp)
          );

          const unserialized = Array.from(events);
          const serialized = unserialized.flatMap((event) => event.serialize());

          destinationOnlyTraceId = serialized.find(
            (event) => event['service.name'] === 'destination-only-service' && event['trace.id']
          )?.['trace.id'];

          const unserializedChanged = serialized.map((event) => ({
            fields: event,
            serialize: () => [event],
          })) as Array<Serializable<ApmFields>>;

          return synthtraceEsClient.index(Readable.from([...unserializedChanged]));
        });

        after(async () => {
          await synthtraceEsClient.clean();
        });

        it('returns trace correlation found only in destination node', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/diagnostics/service-map',
            params: {
              body: {
                start,
                end,
                sourceNode: 'non-existent-source',
                destinationNode: 'destination-only-service',
                ...(destinationOnlyTraceId && { traceId: destinationOnlyTraceId }),
              },
            },
          });

          expect(status).toBe(200);
          expect(body.analysis.traceCorrelation?.found).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInSourceNode).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInDestinationNode).toBe(true);
          expect(body.analysis.traceCorrelation?.sourceNodeDocumentCount).toBe(0);
          expect(body.analysis.traceCorrelation?.destinationNodeDocumentCount).toBeGreaterThan(0);
        });
      });

      describe('when querying with mismatched service names', () => {
        let traceId: string | undefined;

        before(async () => {
          synthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

          const serviceA = apm
            .service({ name: 'service-a', environment: 'prod', agentName: 'nodejs' })
            .instance('instance-a');
          const serviceB = apm
            .service({ name: 'service-b', environment: 'prod', agentName: 'go' })
            .instance('instance-b');

          const range = timerange(start, end).interval('10s').rate(1);

          const events = range.generator((timestamp) =>
            serviceA
              .transaction({ transactionName: 'GET /api/call' })
              .duration(400)
              .timestamp(timestamp)
              .children(
                serviceA
                  .span(
                    httpExitSpan({
                      spanName: 'GET /service-b/endpoint',
                      destinationUrl: 'http://service-b:3000',
                    })
                  )
                  .duration(300)
                  .timestamp(timestamp + 10)
                  .children(
                    serviceB
                      .transaction({ transactionName: 'GET /service-b/endpoint' })
                      .duration(200)
                      .timestamp(timestamp + 20)
                  )
              )
          );

          const unserialized = Array.from(events);
          const serialized = unserialized.flatMap((event) => event.serialize());

          traceId = serialized.find(
            (event) => event['service.name'] === 'service-a' && event['trace.id']
          )?.['trace.id'];

          const unserializedChanged = serialized.map((event) => ({
            fields: event,
            serialize: () => [event],
          })) as Array<Serializable<ApmFields>>;

          return synthtraceEsClient.index(Readable.from([...unserializedChanged]));
        });

        after(async () => {
          await synthtraceEsClient.clean();
        });

        it('returns no correlation when querying with wrong service names', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/diagnostics/service-map',
            params: {
              body: {
                start,
                end,
                sourceNode: 'wrong-service-name',
                destinationNode: 'another-wrong-service',
                ...(traceId && { traceId }),
              },
            },
          });

          expect(status).toBe(200);
          expect(body.analysis.traceCorrelation?.found).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInSourceNode).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInDestinationNode).toBe(false);
          expect(body.analysis.traceCorrelation?.sourceNodeDocumentCount).toBe(0);
          expect(body.analysis.traceCorrelation?.destinationNodeDocumentCount).toBe(0);
        });

        it('returns correlation only in source when destination service name is wrong', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/diagnostics/service-map',
            params: {
              body: {
                start,
                end,
                sourceNode: 'service-a',
                destinationNode: 'wrong-service-name',
                ...(traceId && { traceId }),
              },
            },
          });

          expect(status).toBe(200);
          expect(body.analysis.traceCorrelation?.found).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInSourceNode).toBe(true);
          expect(body.analysis.traceCorrelation?.foundInDestinationNode).toBe(false);
          expect(body.analysis.traceCorrelation?.sourceNodeDocumentCount).toBeGreaterThan(0);
          expect(body.analysis.traceCorrelation?.destinationNodeDocumentCount).toBe(0);
        });

        it('returns correlation only in destination when source service name is wrong', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/diagnostics/service-map',
            params: {
              body: {
                start,
                end,
                sourceNode: 'wrong-service-name',
                destinationNode: 'service-b',
                ...(traceId && { traceId }),
              },
            },
          });

          expect(status).toBe(200);
          expect(body.analysis.traceCorrelation?.found).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInSourceNode).toBe(false);
          expect(body.analysis.traceCorrelation?.foundInDestinationNode).toBe(true);
          expect(body.analysis.traceCorrelation?.sourceNodeDocumentCount).toBe(0);
          expect(body.analysis.traceCorrelation?.destinationNodeDocumentCount).toBeGreaterThan(0);
        });
      });
    });
  });
}
