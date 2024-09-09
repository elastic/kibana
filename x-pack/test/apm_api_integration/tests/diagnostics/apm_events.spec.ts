/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { sumBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const es = getService('es');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  // FLAKY: https://github.com/elastic/kibana/issues/177144
  registry.when('Diagnostics: APM Events', { config: 'basic', archives: [] }, () => {
    describe('When there is no data', () => {
      before(async () => {
        // delete APM data streams
        await es.indices.deleteDataStream({ name: '*apm*' });
      });

      it('returns zero data streams`', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);
        expect(body.apmEvents.every(({ docCount }) => docCount === 0)).to.be(true);
      });
    });

    describe('When data is ingested', () => {
      before(async () => {
        const instance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(30)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /users' })
                .timestamp(timestamp)
                .duration(100)
                .success()
            )
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns zero doc_counts when no time range is specified', async () => {
        const { body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });

        expect(body.apmEvents.every(({ docCount }) => docCount === 0)).to.be(true);
      });

      it('returns non-zero doc_counts when time range is specified', async () => {
        const { body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics',
          params: {
            query: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
          },
        });

        expect(body.apmEvents.every(({ docCount }) => docCount === 0)).to.be(false);
        expect(
          body.apmEvents
            .filter(({ docCount }) => docCount > 0)
            .map(({ kuery, docCount }) => ({ kuery, docCount }))
        ).to.eql([
          {
            kuery:
              'processor.event: "metric" AND metricset.name: "service_transaction" AND transaction.duration.summary :* ',
            docCount: 21,
          },
          {
            kuery:
              'processor.event: "metric" AND metricset.name: "transaction" AND transaction.duration.summary :* ',
            docCount: 21,
          },
          {
            kuery: 'processor.event: "metric" AND metricset.name: "service_summary"',
            docCount: 21,
          },
          { kuery: 'processor.event: "metric" AND metricset.name: "span_breakdown"', docCount: 15 },
          { kuery: 'processor.event: "transaction"', docCount: 450 },
        ]);
      });

      describe('transactions', () => {
        let body: APIReturnType<'GET /internal/apm/diagnostics'>;

        const expectedDocCount = 450;

        beforeEach(async () => {
          const res = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/diagnostics',
            params: {
              query: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
            },
          });

          body = res.body;
        });

        it('raw transaction events', () => {
          const rawTransactions = body.apmEvents.find(({ kuery }) =>
            kuery.includes('processor.event: "transaction"')
          );

          expect(rawTransactions?.docCount).to.be(expectedDocCount);
        });

        it('transaction metrics', () => {
          const transactionMetrics = body.apmEvents.find(({ kuery }) =>
            kuery.includes('metricset.name: "transaction"')
          );

          const intervalDocCount = sumBy(
            Object.values(transactionMetrics?.intervals ?? {}),
            ({ metricDocCount }) => metricDocCount
          );
          expect(transactionMetrics?.docCount).to.be(intervalDocCount);
          expect(transactionMetrics?.docCount).to.be(21);

          expect(transactionMetrics?.intervals).to.eql({
            '1m': { metricDocCount: 15, eventDocCount: expectedDocCount },
            '10m': { metricDocCount: 4, eventDocCount: expectedDocCount },
            '60m': { metricDocCount: 2, eventDocCount: expectedDocCount },
          });
        });

        it('service transactions', () => {
          const serviceTransactionMetrics = body.apmEvents.find(({ kuery }) =>
            kuery.includes('metricset.name: "service_transaction"')
          );

          const intervalDocCount = sumBy(
            Object.values(serviceTransactionMetrics?.intervals ?? {}),
            ({ metricDocCount }) => metricDocCount
          );

          expect(serviceTransactionMetrics?.docCount).to.be(intervalDocCount);
          expect(serviceTransactionMetrics?.docCount).to.be(21);

          expect(serviceTransactionMetrics?.kuery).to.be(
            'processor.event: "metric" AND metricset.name: "service_transaction" AND transaction.duration.summary :* '
          );

          expect(serviceTransactionMetrics?.intervals).to.eql({
            '1m': { metricDocCount: 15, eventDocCount: expectedDocCount },
            '10m': { metricDocCount: 4, eventDocCount: expectedDocCount },
            '60m': { metricDocCount: 2, eventDocCount: expectedDocCount },
          });
        });
      });

      it('returns zero doc_counts when filtering by a non-existing service', async () => {
        const { body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics',
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              kuery: 'service.name: "foo"',
            },
          },
        });

        expect(body.apmEvents.every(({ docCount }) => docCount === 0)).to.be(true);
      });

      it('returns non-zero doc_counts when filtering by an existing service', async () => {
        const { body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics',
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              kuery: 'service.name: "synth-go"',
            },
          },
        });

        expect(body.apmEvents.every(({ docCount }) => docCount === 0)).to.be(false);
      });
    });
  });
}
