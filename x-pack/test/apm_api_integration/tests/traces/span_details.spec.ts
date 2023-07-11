/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { Readable } from 'stream';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  async function fetchSpanDetails({
    traceId,
    spanId,
    parentTransactionId,
  }: {
    traceId: string;
    spanId: string;
    parentTransactionId?: string;
  }) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/traces/{traceId}/spans/{spanId}`,
      params: {
        path: { traceId, spanId },
        query: { parentTransactionId },
      },
    });
  }

  registry.when('Span details dont exist', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await fetchSpanDetails({
        traceId: 'foo',
        spanId: 'bar',
      });

      expect(response.status).to.be(200);
      expect(response.body).to.eql({});
    });
  });

  registry.when('Span details', { config: 'basic', archives: [] }, () => {
    let traceId: string;
    let spanId: string;
    let parentTransactionId: string;
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

      const entities = unserialized.flatMap((event) => event.serialize());

      const span = entities.find((entity) => {
        return entity['processor.event'] === 'span';
      });
      spanId = span?.['span.id']!;
      parentTransactionId = span?.['parent.id']!;
      traceId = span?.['trace.id']!;

      await synthtraceEsClient.index(Readable.from(unserialized));
    });

    after(() => synthtraceEsClient.clean());

    describe('span details', () => {
      let spanDetails: Awaited<ReturnType<typeof fetchSpanDetails>>['body'];
      before(async () => {
        const response = await fetchSpanDetails({
          traceId,
          spanId,
          parentTransactionId,
        });
        expect(response.status).to.eql(200);
        spanDetails = response.body;
      });
      it('returns span details', () => {
        expect(spanDetails.span?.span.name).to.eql('get_green_apple_🍏');
        expect(spanDetails.parentTransaction?.transaction.name).to.eql('GET /apple 🍏');
      });
    });
  });
}
