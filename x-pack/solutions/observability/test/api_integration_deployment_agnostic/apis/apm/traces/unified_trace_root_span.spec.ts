/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, apmOtel, timerange, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import expect from '@kbn/expect';
import { Readable } from 'stream';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  const fetchRootSpan = (traceId: string) =>
    apmApiClient.readUser({
      endpoint: `GET /internal/apm/unified_traces/{traceId}/root_span`,
      params: {
        path: { traceId },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });

  describe('Unified trace root span', () => {
    describe('Root span does not exist', () => {
      it('handles empty state', async () => {
        const response = await fetchRootSpan('foo');

        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    });

    describe('when APM root transaction exists', () => {
      let traceId: string;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        const instanceJava = apm
          .service({ name: 'synth-apple', environment: 'production', agentName: 'java' })
          .instance('instance-b');
        const events = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return [
              instanceJava
                .transaction({ transactionName: 'GET /apple 🍏' })
                .timestamp(timestamp)
                .duration(1000)
                .success()
                .children(
                  instanceJava
                    .span({
                      spanName: 'get_green_apple_🍏',
                      spanType: 'db',
                      spanSubtype: 'elasticsearch',
                    })
                    .timestamp(timestamp + 50)
                    .duration(900)
                    .success()
                ),
            ];
          });
        const unserialized = Array.from(events);

        const serialized = unserialized.flatMap((event) => event.serialize());

        traceId = serialized[0]['trace.id']!;

        await apmSynthtraceEsClient.index(Readable.from(unserialized));
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns APM root transaction duration', async () => {
        const response = await fetchRootSpan(traceId);

        expect(response.status).to.eql(200);
        expect(response.body?.duration).to.equal(1000000);
      });
    });

    describe('when OTel processed root span exists', () => {
      let traceId: string;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        apmSynthtraceEsClient.setPipeline(
          apmSynthtraceEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel)
        );

        const otelInstance = apmOtel
          .service({
            name: 'otel-processed-service',
            namespace: 'production',
            sdkName: 'opentelemetry',
            sdkLanguage: 'java',
            distro: 'elastic',
          })
          .instance('otel-processed-instance');

        const events = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return [
              otelInstance
                .span({
                  name: 'GET /otel-processed-endpoint',
                  kind: 'Server',
                })
                .timestamp(timestamp)
                .duration(2000)
                .success()
                .children(
                  otelInstance
                    .span({
                      name: 'otel-processed-db-query',
                      kind: 'Internal',
                    })
                    .timestamp(timestamp + 50)
                    .duration(900)
                    .success()
                ),
            ];
          });

        const unserialized = Array.from(events);
        const serialized = unserialized.flatMap((event) => event.serialize());

        traceId = serialized[0].trace_id!;

        await apmSynthtraceEsClient.index(Readable.from(unserialized));
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns OTel processed root span duration', async () => {
        const response = await fetchRootSpan(traceId);

        expect(response.status).to.eql(200);
        expect(response.body?.duration).to.equal(2000000);
      });
    });

    describe('when OTel non-processed root span exists', () => {
      let traceId: string;
      let es: ReturnType<typeof getService<'es'>>;

      before(async () => {
        es = getService('es');

        const otelInstance = apmOtel
          .service({
            name: 'otel-unprocessed-service',
            namespace: 'production',
            sdkName: 'opentelemetry',
            sdkLanguage: 'java',
            distro: 'elastic',
          })
          .instance('otel-unprocessed-instance');

        const events = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return [
              otelInstance
                .span({
                  name: 'otel-unprocessed-root-span',
                  kind: 'Server',
                })
                .timestamp(timestamp)
                .duration(500)
                .success(),
            ];
          });

        const unserialized = Array.from(events);
        const serialized = unserialized.flatMap((event) => event.serialize());
        traceId = serialized[0].trace_id!;
        const rootSpanEvent = serialized.find(
          (event) => event.kind === 'Server' && event.name === 'otel-unprocessed-root-span'
        );
        const unprocessedSpan = {
          ...rootSpanEvent!,
        };

        await es.index({
          index: 'traces-generic.otel-default',
          document: unprocessedSpan,
          refresh: 'wait_for',
        });
      });

      after(async () => {
        await es.deleteByQuery({
          index: 'traces-generic.otel-default*',
          query: {
            term: { trace_id: traceId },
          },
          refresh: true,
          conflicts: 'proceed',
        });
      });

      it('returns OTel non-processed root span duration', async () => {
        const response = await fetchRootSpan(traceId);

        expect(response.status).to.eql(200);
        expect(response.body?.duration).to.equal(500);
      });
    });
  });
}
