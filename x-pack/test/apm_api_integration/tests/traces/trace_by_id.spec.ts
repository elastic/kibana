/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { Readable } from 'stream';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  registry.when('Trace does not exist', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await apmApiClient.readUser({
        endpoint: `GET /internal/apm/traces/{traceId}`,
        params: {
          path: { traceId: 'foo' },
          query: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            entryTransactionId: 'foo',
          },
        },
      });

      expect(response.status).to.be(200);
      expect(response.body).to.eql({
        traceItems: {
          exceedsMax: false,
          traceDocs: [],
          errorDocs: [],
          spanLinksCountById: {},
          traceDocsTotal: 0,
          maxTraceItems: 5000,
        },
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/177545
  registry.when('Trace exists', { config: 'basic', archives: [] }, () => {
    let entryTransactionId: string;
    let serviceATraceId: string;

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

      entryTransactionId = serialized[0]['transaction.id']!;
      serviceATraceId = serialized[0]['trace.id']!;

      await apmSynthtraceEsClient.index(Readable.from(unserialized));
    });

    after(() => apmSynthtraceEsClient.clean());

    describe('return trace', () => {
      let traces: APIReturnType<'GET /internal/apm/traces/{traceId}'>;
      before(async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/traces/{traceId}`,
          params: {
            path: { traceId: serviceATraceId },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              entryTransactionId,
            },
          },
        });

        expect(response.status).to.eql(200);
        traces = response.body;
      });

      it('returns some errors', () => {
        expect(traces.traceItems.errorDocs.length).to.be.greaterThan(0);
        expect(traces.traceItems.errorDocs[0].error.exception?.[0].message).to.eql(
          '[ResponseError] index_not_found_exception'
        );
      });

      it('returns some trace docs', () => {
        expect(traces.traceItems.traceDocs.length).to.be.greaterThan(0);
        expect(
          traces.traceItems.traceDocs.map((item) => {
            if (item.span && 'name' in item.span) {
              return item.span.name;
            }
            if (item.transaction && 'name' in item.transaction) {
              return item.transaction.name;
            }
          })
        ).to.eql(['GET /apple 🍏', 'get_green_apple_🍏']);
      });

      it('returns entry transaction details', () => {
        expect(traces.entryTransaction).to.not.be(undefined);
        expect(traces.entryTransaction?.transaction.id).to.equal(entryTransactionId);
        expect(traces.entryTransaction?.transaction.name).to.equal('GET /apple 🍏');
      });
    });
  });
}
