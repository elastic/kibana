/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { omit, uniq } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi({
    dependencyName,
    spanName,
    kuery = '',
    environment = ENVIRONMENT_ALL.value,
    sampleRangeFrom,
    sampleRangeTo,
  }: {
    dependencyName: string;
    spanName: string;
    kuery?: string;
    environment?: string;
    sampleRangeFrom?: number;
    sampleRangeTo?: number;
  }) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/dependencies/operations/spans`,
      params: {
        query: {
          dependencyName,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment,
          kuery,
          spanName,
          sampleRangeFrom,
          sampleRangeTo,
        },
      },
    });
  }

  registry.when(
    'Top dependency spans when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { body, status } = await callApi({
          dependencyName: 'elasticsearch',
          spanName: '/_search',
        });

        expect(status).to.be(200);
        expect(body.spans).to.empty();
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177135
  registry.when(
    'Top dependency spans when data is loaded',
    { config: 'basic', archives: [] },
    () => {
      const javaInstance = apm
        .service({ name: 'java', environment: 'production', agentName: 'java' })
        .instance('instance-a');

      const goInstance = apm
        .service({ name: 'go', environment: 'development', agentName: 'go' })
        .instance('instance-a');

      before(async () => {
        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) => [
              javaInstance
                .span({
                  spanName: 'without transaction',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .destination('elasticsearch')
                .duration(200)
                .timestamp(timestamp),
              javaInstance
                .transaction({ transactionName: 'GET /api/my-endpoint' })
                .duration(100)
                .timestamp(timestamp)
                .children(
                  javaInstance
                    .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
                    .destination('elasticsearch')
                    .duration(100)
                    .success()
                    .timestamp(timestamp)
                ),
              goInstance
                .transaction({ transactionName: 'GET /api/my-other-endpoint' })
                .duration(100)
                .timestamp(timestamp)
                .children(
                  goInstance
                    .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
                    .destination('elasticsearch')
                    .duration(50)
                    .timestamp(timestamp)
                ),
              goInstance
                .transaction({ transactionName: 'GET /api/my-other-endpoint' })
                .duration(100)
                .timestamp(timestamp)
                .children(
                  goInstance
                    .span({
                      spanName: '/_search',
                      spanType: 'db',
                      spanSubtype: 'fake-elasticsearch',
                    })
                    .destination('fake-elasticsearch')
                    .duration(50)
                    .timestamp(timestamp)
                ),
            ]),
        ]);
      });

      describe('without a kuery or environment', () => {
        it('returns the correct spans for the requested spanName', async () => {
          const response = await callApi({
            dependencyName: 'elasticsearch',
            spanName: '/_search',
          });

          const { spans } = response.body;

          const spanNames = uniq(spans.map((span) => span.spanName));
          const javaSpans = spans.filter((span) => span.serviceName === 'java');
          const goSpans = spans.filter((span) => span.serviceName === 'go');

          expect(spanNames).to.eql(['/_search']);

          expect(javaSpans.length).to.be.greaterThan(0);
          expect(goSpans.length).to.be.greaterThan(0);

          expect(javaSpans.length + goSpans.length).to.eql(spans.length);

          expect(omit(javaSpans[0], 'spanId', 'traceId', 'transactionId')).to.eql({
            '@timestamp': 1609460040000,
            agentName: 'java',
            duration: 100000,
            serviceName: 'java',
            spanName: '/_search',
            transactionName: 'GET /api/my-endpoint',
            transactionType: 'request',
            outcome: 'success',
          });

          expect(omit(goSpans[0], 'spanId', 'traceId', 'transactionId')).to.eql({
            '@timestamp': 1609460040000,
            agentName: 'go',
            duration: 50000,
            serviceName: 'go',
            spanName: '/_search',
            transactionName: 'GET /api/my-other-endpoint',
            transactionType: 'request',
            outcome: 'unknown',
          });
        });
      });

      describe('with a kuery', () => {
        it('returns the correct spans for the requested spanName', async () => {
          const response = await callApi({
            dependencyName: 'elasticsearch',
            spanName: '/_search',
            kuery: 'service.name:go',
          });

          const { spans } = response.body;

          const spanNames = uniq(spans.map((span) => span.spanName));
          const javaSpans = spans.filter((span) => span.serviceName === 'java');
          const goSpans = spans.filter((span) => span.serviceName === 'go');

          expect(spanNames).to.eql(['/_search']);

          expect(javaSpans.length).to.be(0);
          expect(goSpans.length).to.be.greaterThan(0);
          expect(goSpans.length).to.eql(spans.length);
        });
      });

      describe('with an environment', () => {
        it('returns the correct spans for the requested spanName', async () => {
          const response = await callApi({
            dependencyName: 'elasticsearch',
            spanName: '/_search',
            environment: 'development',
          });

          const { spans } = response.body;

          const spanNames = uniq(spans.map((span) => span.spanName));
          const javaSpans = spans.filter((span) => span.serviceName === 'java');
          const goSpans = spans.filter((span) => span.serviceName === 'go');

          expect(spanNames).to.eql(['/_search']);

          expect(javaSpans.length).to.be(0);
          expect(goSpans.length).to.be.greaterThan(0);
          expect(goSpans.length).to.eql(spans.length);
        });
      });

      describe('when requesting spans within a specific sample range', () => {
        it('returns only spans whose duration falls into the requested range', async () => {
          const response = await callApi({
            dependencyName: 'elasticsearch',
            spanName: '/_search',
            sampleRangeFrom: 50000,
            sampleRangeTo: 99999,
          });

          const { spans } = response.body;

          expect(spans.every((span) => span.duration === 50000)).to.be(true);
        });
      });

      after(() => apmSynthtraceEsClient.clean());
    }
  );
}
