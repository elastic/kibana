/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, EntityArrayIterable, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateExternalSpanLinks, getSpanLinksFromEvents } from '../span_links/helper';

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
    query: { start: string; end: string; _inspect?: boolean };
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
        traceDocs: [],
        errorDocs: [],
        linkedChildrenOfSpanCountBySpanId: {},
      });
    });
  });

  registry.when('Trace exists', { config: 'basic', archives: ['apm_mappings_only_8.0.0'] }, () => {
    let serviceATraceId: string;
    before(async () => {
      const instanceJava = apm.service('synth-apple', 'production', 'java').instance('instance-b');
      const events = timerange(start, end)
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return [
            instanceJava
              .transaction('GET /apple 🍏')
              .timestamp(timestamp)
              .duration(1000)
              .failure()
              .errors(
                instanceJava
                  .error('[ResponseError] index_not_found_exception')
                  .timestamp(timestamp + 50)
              )
              .children(
                instanceJava
                  .span('get_green_apple_🍏', 'db', 'elasticsearch')
                  .timestamp(timestamp + 50)
                  .duration(900)
                  .success()
              ),
          ];
        });
      const entities = events.toArray();
      serviceATraceId = entities.slice(0, 1)[0]['trace.id']!;

      await synthtraceEsClient.index(new EntityArrayIterable(entities));
    });

    after(() => synthtraceEsClient.clean());

    describe('return trace', () => {
      let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
      before(async () => {
        const response = await fetchTraces({
          traceId: serviceATraceId,
          query: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
        });
        expect(response.status).to.eql(200);
        traces = response.body;
      });
      it('returns some errors', () => {
        expect(traces.errorDocs.length).to.be.greaterThan(0);
        expect(traces.errorDocs[0].error.exception?.[0].message).to.eql(
          '[ResponseError] index_not_found_exception'
        );
      });

      it('returns some trace docs', () => {
        expect(traces.traceDocs.length).to.be.greaterThan(0);
        expect(
          traces.traceDocs.map((item) => {
            if (item.span && 'name' in item.span) {
              return item.span.name;
            }
            if (item.transaction && 'name' in item.transaction) {
              return item.transaction.name;
            }
          })
        ).to.eql(['GET /apple 🍏', 'get_green_apple_🍏']);
      });
    });
  });

  registry.when(
    'Trace with span links',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      let serviceATraceId: string;
      let serviceBTraceId: string;
      before(async () => {
        const instanceJava = apm.service('Service-A', 'production', 'java').instance('instance-a');
        const serviceAEvents = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return instanceJava
              .transaction('GET /service_A')
              .timestamp(timestamp)
              .duration(1000)
              .success()
              .children(
                instanceJava
                  .span('get_service_A', 'db', 'elasticsearch')
                  .defaults({ 'span.links': generateExternalSpanLinks(3) })
                  .timestamp(timestamp + 50)
                  .duration(900)
                  .success()
              );
          });

        const serviceAEventsAsArray = serviceAEvents.toArray();
        serviceATraceId = serviceAEventsAsArray.slice(0, 1)[0]['trace.id']!;
        const serviceASpanLinks = getSpanLinksFromEvents(serviceAEventsAsArray);

        const instanceRuby = apm
          .service('synth-banana', 'production', 'ruby')
          .instance('instance-c');
        const serviceB = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return instanceRuby
              .transaction('GET /service_B')
              .timestamp(timestamp)
              .duration(1000)
              .success()
              .children(
                instanceRuby
                  .span('get_service_B', 'resource', 'css')
                  .defaults({ 'span.links': serviceASpanLinks })
                  .timestamp(timestamp + 50)
                  .duration(900)
                  .success()
              );
          });

        serviceBTraceId = serviceB.toArray().slice(0, 1)[0]['trace.id']!;

        await synthtraceEsClient.index(
          new EntityArrayIterable(serviceAEventsAsArray).merge(serviceB)
        );
      });

      after(() => synthtraceEsClient.clean());

      describe('should not return outgoing links ', async () => {
        let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
        before(async () => {
          const response = await fetchTraces({
            traceId: serviceBTraceId,
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
            },
          });
          expect(response.status).to.eql(200);
          traces = response.body;
        });
        it('returns empty outgoing links', () => {
          expect(traces.linkedChildrenOfSpanCountBySpanId).to.be.empty();
        });
      });

      describe('should return outgoing links ', async () => {
        let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
        before(async () => {
          const response = await fetchTraces({
            traceId: serviceATraceId,
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
            },
          });
          expect(response.status).to.eql(200);
          traces = response.body;
        });
        it('return outgoing links', () => {
          expect(traces.linkedChildrenOfSpanCountBySpanId).not.to.be.empty();
        });
      });
    }
  );
}
