/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
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

  const fetchSpan = (traceId: string, spanId: string) =>
    apmApiClient.readUser({
      endpoint: `GET /internal/apm/unified_traces/{traceId}/spans/{spanId}`,
      params: {
        path: { traceId, spanId },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });

  describe('Unified trace span', () => {
    describe('Span does not exist', () => {
      it('handles empty state', async () => {
        const response = await fetchSpan('foo', 'bar');

        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    });

    describe('when APM span exists', () => {
      let spanId: string;
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
                .failure()
                .errors(
                  instanceJava
                    .error({ message: '[ResponseError] index_not_found_exception' })
                    .timestamp(timestamp + 50)
                )
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
        const spanEvent = serialized.find((event) => event['processor.event'] === 'span');
        spanId = spanEvent?.['span.id']!;

        await apmSynthtraceEsClient.index(Readable.from(unserialized));
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('return span', () => {
        let span: APIReturnType<'GET /internal/apm/unified_traces/{traceId}/spans/{spanId}'>;
        before(async () => {
          const response = await fetchSpan(traceId, spanId);

          expect(response.status).to.eql(200);
          span = response.body;
        });

        it('returns span document', () => {
          expect(span).to.not.be(undefined);
          expect(span?._id).to.not.be(undefined);
          expect(span?._index).to.not.be(undefined);
        });

        it('returns span with correct span id', () => {
          expect(span?.span?.id).to.equal(spanId);
        });

        it('returns span with correct trace id', () => {
          expect(span?.trace?.id).to.equal(traceId);
        });

        it('returns span with correct name', () => {
          expect(span?.span?.name).to.equal('get_green_apple_🍏');
        });

        it('returns span with correct type and subtype', () => {
          expect(span?.span?.type).to.equal('db');
          expect(span?.span?.subtype).to.equal('elasticsearch');
        });
      });
    });

    describe('when processedOTel span exists', () => {
      let spanId: string;
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
                .duration(1000)
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
        const spanEvent = serialized.find((event) => event.name === 'otel-processed-db-query');
        spanId = spanEvent?.span_id!;

        await apmSynthtraceEsClient.index(Readable.from(unserialized));
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns OTel processed span', async () => {
        const response = await fetchSpan(traceId, spanId);

        expect(response.status).to.eql(200);
        expect(response.body?.span?.id).to.equal(spanId);
        expect(response.body?.trace?.id).to.equal(traceId);
        expect(response.body?.span?.name).to.equal('otel-processed-db-query');
      });
    });

    describe('when non-processed OTel span exists', () => {
      let spanId: string;
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
                  name: 'otel-unprocessed-db-query',
                  kind: 'Internal',
                })
                .timestamp(timestamp)
                .duration(500)
                .success(),
            ];
          });

        const unserialized = Array.from(events);
        const serialized = unserialized.flatMap((event) => event.serialize());

        traceId = serialized[0].trace_id!;
        const spanEvent = serialized.find(
          (event) => event.kind === 'Internal' && event.name === 'otel-unprocessed-db-query'
        );
        spanId = spanEvent?.span_id!;

        const unprocessedSpan = {
          ...spanEvent!,
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
            term: { span_id: spanId },
          },
          refresh: true,
          conflicts: 'proceed',
        });
      });

      it('returns OTel non-processed span', async () => {
        const response = await fetchSpan(traceId, spanId);

        expect(response.status).to.eql(200);
        expect(response.body?.span?.id).to.equal(spanId);
        expect(response.body?.trace?.id).to.equal(traceId);
        expect(response.body?.span?.name).to.equal('otel-unprocessed-db-query');
      });
    });
  });
}
