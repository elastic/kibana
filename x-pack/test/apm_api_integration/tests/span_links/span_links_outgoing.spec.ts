/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, EntityArrayIterable, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { SpanLink } from '@kbn/apm-plugin/typings/es_schemas/raw/fields/span_links';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  generateExternalSpanLinks,
  generateIncomeEventsSpanLinks,
  getSpanLinksFromEvents,
} from './helper';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  async function getIncomingSpanDetails({
    kuery,
    traceId,
    spanId,
  }: {
    kuery: string;
    traceId: string;
    spanId: string;
  }) {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/outgoing',
      params: {
        path: {
          traceId,
          spanId,
        },
        query: {
          kuery,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  registry.when(
    'Outgoing span links dont exist',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      it('handles empty state', async () => {
        const response = await getIncomingSpanDetails({ kuery: '', traceId: 'foo', spanId: 'bar' });
        expect(response.status).to.be(200);
        expect(response.body.spanLinksDetails).to.be.empty();
      });
    }
  );

  registry.when(
    'contains outgoing span links',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      let externalSpanLinks: SpanLink[];
      let serviceBTraceId: string;
      let serviceBTransactionId: string;
      before(async () => {
        const serviceBAsArray = generateIncomeEventsSpanLinks().toArray();
        const transaction = serviceBAsArray.slice(0, 1)[0];
        serviceBTraceId = transaction['trace.id']!;
        serviceBTransactionId = transaction['transaction.id']!;

        externalSpanLinks = generateExternalSpanLinks(3);

        const instanceJava = apm.service('service-A', 'production', 'java').instance('instance-a');
        const serviceAEvents = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return instanceJava
              .transaction('GET /service_A')
              .defaults({
                'span.links': [...externalSpanLinks, ...getSpanLinksFromEvents(serviceBAsArray)],
              })
              .timestamp(timestamp)
              .duration(1000)
              .success()
              .children(
                instanceJava
                  .span('get_service_A', 'db', 'elasticsearch')
                  .timestamp(timestamp + 50)
                  .duration(900)
                  .success()
              );
          });

        await synthtraceEsClient.index(
          new EntityArrayIterable(serviceBAsArray).merge(serviceAEvents)
        );
      });

      after(() => synthtraceEsClient.clean());

      describe('should have span links details', async () => {
        let spanLinksDetails: Awaited<ReturnType<typeof getIncomingSpanDetails>>['body'];
        before(async () => {
          const response = await getIncomingSpanDetails({
            kuery: '',
            traceId: serviceBTraceId,
            spanId: serviceBTransactionId,
          });
          expect(response.status).to.eql(200);
          spanLinksDetails = response.body;
        });

        it('returns service-A as outgoing span links', () => {
          expect(
            spanLinksDetails.spanLinksDetails.filter((item) => item.serviceName === 'service-A')
              .length
          ).to.be.greaterThan(0);
        });
      });

      describe('with kuery', async () => {
        let spanLinksDetails: Awaited<ReturnType<typeof getIncomingSpanDetails>>['body'];
        before(async () => {
          const response = await getIncomingSpanDetails({
            traceId: serviceBTraceId,
            spanId: serviceBTransactionId,
            kuery: 'service-A',
          });
          expect(response.status).to.eql(200);
          spanLinksDetails = response.body;
        });

        it('does not return external links', () => {
          expect(
            spanLinksDetails.spanLinksDetails.map((item) => `${item.traceId}:${item.spanId}`)
          ).not.to.be.eql(externalSpanLinks.map((item) => `${item.trace?.id}:${item.span.id}`));
        });
      });
    }
  );
}
