/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, otelLog, log, timerange, generateLongId } from '@kbn/synthtrace-client';
import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { Readable } from 'stream';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2025-09-15T00:00:00.000Z').getTime();
  const end = new Date('2025-09-15T00:15:00.000Z').getTime() - 1;

  const endWithOffset = end + 100000;

  describe('Unified trace errors', () => {
    async function fetchUnifiedTraceErrors({
      traceId,
      spanId,
    }: {
      traceId: string;
      spanId?: string;
      transactionId?: string;
    }) {
      return apmApiClient.readUser({
        endpoint: `GET /internal/apm/unified_traces/{traceId}/errors`,
        params: {
          path: { traceId },
          query: {
            start: new Date(start).toISOString(),
            end: new Date(endWithOffset).toISOString(),
            ...(spanId && { docId: spanId }),
          },
        },
      });
    }

    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;
    before(async () => {
      logsSynthtraceEsClient = await synthtrace.createLogsSynthtraceEsClient();
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
    });

    describe('when APM errors exist', () => {
      let traceId: string;

      before(async () => {
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
                    .error({
                      message: 'index_not_found_exception: no such index [.kibana_locks-000001]',
                      type: 'Error',
                    })
                    .timestamp(timestamp + 50),
                  instanceJava
                    .error({
                      message: '[ResponseError] index_not_found_exception',
                      culprit: '_request (node_modules/@elastic/transport/lib/Transport.js)',
                      type: 'ResponseError',
                    })
                    .timestamp(timestamp + 100)
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
        const entities = unserialized.flatMap((event) => event.serialize());
        const error = entities.find((entity) => {
          return entity['processor.event'] === 'span';
        });

        traceId = error?.['trace.id']!;

        await apmSynthtraceEsClient.index(Readable.from(unserialized));
      });

      after(async () => await apmSynthtraceEsClient.clean());

      it('returns APM errors for the trace with per-error source', async () => {
        const response = await fetchUnifiedTraceErrors({ traceId });

        expect(response.status).to.be(200);
        expect(response.body.traceErrors).to.have.length(2);

        expect(response.body.traceErrors[0].error.grouping_key).to.be(
          '[ResponseError] index_not_found_exception'
        );
        expect(response.body.traceErrors[0].error.culprit).to.be(
          '_request (node_modules/@elastic/transport/lib/Transport.js)'
        );
        expect(response.body.traceErrors[0].error.exception?.message).to.be(
          '[ResponseError] index_not_found_exception'
        );
        expect(response.body.traceErrors[0].error.exception?.type).to.be('ResponseError');
        expect(response.body.traceErrors[0].timestamp).to.have.property('us');
        // Each error now carries its own source instead of a trace-wide discriminator.
        expect(response.body.traceErrors[0].source).to.be('apm');
        expect(response.body.traceErrors[1].source).to.be('apm');
        // The trace-wide `source` field has been removed.
        expect(response.body).not.to.have.property('source');
      });
    });

    describe('when unprocessed OTEL errors exist', () => {
      let traceId: string;
      let spanId: string;
      let transactionId: string;

      before(async () => {
        traceId = 'trace123';
        spanId = 'span123';
        transactionId = 'transaction123';

        const otelErrorLogs = timerange(start, end)
          .interval('15m')
          .rate(1)
          .generator((timestamp) => {
            return otelLog
              .create()
              .message('Deadline Exceeded')
              .logLevel('error')
              .timestamp(timestamp)
              .defaults({
                span_id: spanId,
                trace_id: traceId,
                resource: {
                  attributes: {
                    'service.name': 'otel-service',
                    'service.version': '1.0.0',
                    'service.environment': 'production',
                    'telemetry.sdk.language': 'java',
                    'span.id': spanId,
                  },
                },
                attributes: {
                  'log.file.path': `/logs/${generateLongId()}/error.txt`,
                  'span.id': spanId,
                  'transaction.id': transactionId,
                  'event.name': 'exception',
                  'exception.type': 'grpc._channel._MultiThreadedRendezvous',
                  'exception.message': 'Deadline Exceeded',
                },
              });
          });

        await logsSynthtraceEsClient.index(otelErrorLogs);
      });

      after(async () => await logsSynthtraceEsClient.clean());

      it('returns unprocessed OTEL errors for the trace with per-error source', async () => {
        const response = await fetchUnifiedTraceErrors({ traceId, spanId });

        expect(response.status).to.be(200);
        expect(response.body.traceErrors).to.have.length(1);
        expect(response.body.traceErrors[0].source).to.be('unprocessedOtel');
        expect(response.body.traceErrors[0].error.exception?.message).to.be('Deadline Exceeded');
        expect(response.body.traceErrors[0].error.exception?.type).to.be(
          'grpc._channel._MultiThreadedRendezvous'
        );
        // The trace-wide `source` field has been removed.
        expect(response.body).not.to.have.property('source');
      });
    });

    describe('when both APM and unprocessed OTel errors exist on the same trace', () => {
      let traceId: string;
      let spanId: string;

      before(async () => {
        // Build a real APM trace so we can get a valid traceId / spanId.
        const instanceJava = apm
          .service({ name: 'synth-mixed-errors', environment: 'production', agentName: 'java' })
          .instance('instance-1');

        const txTs = start + 500;
        const events = timerange(start, end)
          .interval('15m')
          .rate(1)
          .generator((timestamp) => {
            return [
              instanceJava
                .transaction({ transactionName: 'POST /order' })
                .timestamp(txTs)
                .duration(800)
                .failure()
                .errors(
                  instanceJava
                    .error({ message: 'DB connection refused', type: 'DBError' })
                    .timestamp(txTs + 50)
                ),
            ];
          });

        const unserialized = Array.from(events);
        const entities = unserialized.flatMap((e) => e.serialize());
        const txDoc = entities.find((e) => e['processor.event'] === 'transaction');
        traceId = txDoc?.['trace.id']!;
        spanId = txDoc?.['transaction.id']!;

        // Two unprocessed OTel exception logs correlated to the same span.
        const otelLogs = timerange(start, end)
          .interval('15m')
          .rate(1)
          .generator((timestamp) =>
            [
              { type: 'ValidationError', msg: 'Missing required field' },
              { type: 'PaymentError', msg: 'Gateway timeout' },
            ].map(({ type, msg }) =>
              log
                .create()
                .message(msg)
                .logLevel('error')
                .defaults({
                  event_name: 'exception',
                  'exception.type': type,
                  'exception.message': msg,
                  'trace.id': traceId,
                  'span.id': spanId,
                  'service.name': 'synth-mixed-errors',
                })
                .timestamp(timestamp + 200)
            )
          );

        await apmSynthtraceEsClient.index(Readable.from(unserialized));
        await logsSynthtraceEsClient.index(otelLogs);
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();
      });

      it('returns all errors merged, each with its own source', async () => {
        const response = await fetchUnifiedTraceErrors({ traceId, spanId });

        expect(response.status).to.be(200);
        // 1 APM error + 2 OTel errors = 3
        expect(response.body.traceErrors).to.have.length(3);

        const sources = response.body.traceErrors.map((e: { source: string }) => e.source);
        expect(sources.filter((s: string) => s === 'apm')).to.have.length(1);
        expect(sources.filter((s: string) => s === 'unprocessedOtel')).to.have.length(2);

        // No trace-wide source discriminator.
        expect(response.body).not.to.have.property('source');
      });
    });
  });
}
