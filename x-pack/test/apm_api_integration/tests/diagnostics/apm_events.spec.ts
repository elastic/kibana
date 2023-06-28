/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const es = getService('es');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  registry.when('Diagnostics: APM Events', { config: 'basic', archives: [] }, () => {
    describe('When there is no data', () => {
      before(async () => {
        // delete APM data streams
        await es.indices.deleteDataStream({ name: '*apm*' });
      });

      it('returns zero data streams`', async () => {
        const { status, body } = await apmApiClient.adminUser({
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

        await synthtraceEsClient.index(
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

      after(() => synthtraceEsClient.clean());

      it('returns zero doc_counts when no time range is specified', async () => {
        const { body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });

        expect(body.apmEvents.every(({ docCount }) => docCount === 0)).to.be(true);
      });

      it('returns non-zero doc_counts when time range is specified', async () => {
        const { body } = await apmApiClient.adminUser({
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
          { kuery: 'processor.event: "metric" AND metricset.name: "span_breakdown"', docCount: 15 },
          {
            kuery: 'processor.event: "metric" AND metricset.name: "service_summary"',
            docCount: 21,
          },
          { kuery: 'processor.event: "transaction"', docCount: 450 },
        ]);
      });

      it('returns zero doc_counts when filtering by a non-existing service', async () => {
        const { body } = await apmApiClient.adminUser({
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
        const { body } = await apmApiClient.adminUser({
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
