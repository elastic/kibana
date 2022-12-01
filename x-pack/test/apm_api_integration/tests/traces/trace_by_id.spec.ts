/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, EntityArrayIterable, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  async function fetchTraces({
    traceId,
    query,
  }: {
    traceId: string;
    query: { start: string; end: string; _inspect?: boolean; entryTransactionId?: string };
  }) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/traces/{traceId}`,
      params: {
        path: { traceId },
        query,
      },
    });
  }

  registry.when('Trace does not exist', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await fetchTraces({
        traceId: 'foo',
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      });

      expect(response.status).to.be(200);
      expect(response.body).to.eql({
        exceedsMax: false,
        totalErrorsCount: 0,
        duration: 0,
        items: [],
        legends: [],
        errorItems: [],
        childrenByParentId: {},
        errorCountById: {},
      });
    });
  });

  registry.when('Trace exists', { config: 'basic', archives: [] }, () => {
    let serviceATraceId: string;
    let entryTransactionId: string;
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
      const entities = events.toArray();
      serviceATraceId = entities.slice(0, 1)[0]['trace.id']!;
      entryTransactionId = entities[0]['transaction.id']!;

      await synthtraceEsClient.index(new EntityArrayIterable(entities));
    });

    after(() => synthtraceEsClient.clean());

    describe('return trace', () => {
      let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
      before(async () => {
        const response = await fetchTraces({
          traceId: serviceATraceId,
          query: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            entryTransactionId,
          },
        });
        expect(response.status).to.eql(200);
        traces = response.body;
      });
      it('returns some errors', () => {
        expect(traces.totalErrorsCount).to.be.greaterThan(0);
        expect(traces.entryTransaction?.event?.outcome).to.be('failure');
      });

      it('returns some trace docs', () => {
        expect(traces.items.length).to.be.greaterThan(0);
        expect(traces.rootWaterfallTransaction?.id).to.equal(traces.items[0].id);
        expect(
          traces.items.map((item) => {
            if (item.docType === ProcessorEvent.span) {
              return item.doc.span.name;
            }
            return item.doc.transaction.name;
          })
        ).to.eql(['GET /apple 🍏', 'get_green_apple_🍏']);
      });
    });
  });
}
