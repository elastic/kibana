/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { Readable } from 'stream';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const es = getService('es');

  const start = new Date('2025-09-15T00:00:00.000Z').getTime();
  const end = new Date('2025-09-15T00:15:00.000Z').getTime() - 1;

  const endWithOffset = end + 100000;

  describe('Unified trace errors', () => {
    async function fetchUnifiedTraceErrors({
      traceId,
      spanId,
      transactionId,
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
            ...(spanId && { spanId }),
            ...(transactionId && { transactionId }),
          },
        },
      });
    }

    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    before(async () => {
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

      // after(() => apmSynthtraceEsClient.clean());

      it('returns APM errors for the trace', async () => {
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
        expect(response.body.source).to.be('apm');
      });
    });
    // TODO
    // describe('when unprocessed OTEL errors exist', () => {
    //
    // });
  });
}
