/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, EntityArrayIterable, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  generateExternalSpanLinks,
  generateIncomeEventsSpanLinks,
  getSpanLinksFromEvents,
  SpanLinks,
} from './helper';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  async function getSpanDetails({ spanLinks, kuery }: { spanLinks: SpanLinks; kuery: string }) {
    return await apmApiClient.readUser({
      endpoint: 'POST /internal/apm/span_links/details',
      params: { query: { kuery }, body: { spanLinks: JSON.stringify(spanLinks) } },
    });
  }

  registry.when(
    'Span links dont exist',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      it('handles empty state', async () => {
        const response = await getSpanDetails({ spanLinks: [], kuery: '' });
        expect(response.status).to.be(200);
        expect(response.body.spanLinksDetails).to.be.empty();
      });
    }
  );

  registry.when(
    'contains span links',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      let externalSpanLinks: SpanLinks;
      let appleIncomingSpanLinks: SpanLinks;
      before(async () => {
        const kiwiEventsAsArray = generateIncomeEventsSpanLinks().toArray();
        externalSpanLinks = generateExternalSpanLinks(3);
        appleIncomingSpanLinks = [
          ...externalSpanLinks,
          ...getSpanLinksFromEvents(kiwiEventsAsArray),
        ];

        const instanceJava = apm
          .service('synth-apple', 'production', 'java')
          .instance('instance-b');
        const appleEvents = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return instanceJava
              .transaction('GET /apple 🍏')
              .timestamp(timestamp)
              .duration(1000)
              .success()
              .children(
                instanceJava
                  .span('get_green_apple_🍏', 'db', 'elasticsearch')
                  .defaults({ 'span.links': appleIncomingSpanLinks })
                  .timestamp(timestamp + 50)
                  .duration(900)
                  .success()
              );
          });

        await synthtraceEsClient.index(
          new EntityArrayIterable(kiwiEventsAsArray).merge(appleEvents)
        );
      });

      after(() => synthtraceEsClient.clean());

      describe('should span links details', async () => {
        let spanLinksDetails: Awaited<ReturnType<typeof getSpanDetails>>['body'];
        before(async () => {
          const response = await getSpanDetails({
            spanLinks: appleIncomingSpanLinks,
            kuery: '',
          });
          expect(response.status).to.eql(200);
          spanLinksDetails = response.body;
        });

        it('returns kiwi service as incoming span links', () => {
          expect(
            spanLinksDetails.spanLinksDetails.filter((item) => item.serviceName === 'synth-kiwi')
              .length
          ).to.be.greaterThan(0);
        });

        it('returns same order of span links requested', () => {
          expect(
            spanLinksDetails.spanLinksDetails.map((item) => `${item.traceId}:${item.spanId}`)
          ).to.be.eql(appleIncomingSpanLinks.map((item) => `${item.trace?.id}:${item.span.id}`));
        });
      });

      describe('with kuery', async () => {
        let spanLinksDetails: Awaited<ReturnType<typeof getSpanDetails>>['body'];
        before(async () => {
          const response = await getSpanDetails({
            spanLinks: appleIncomingSpanLinks,
            kuery: 'serviceName: "synth-kiwi"',
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
