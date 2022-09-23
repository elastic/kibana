/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { TraceSearchType } from '@kbn/apm-plugin/common/trace_explorer';
import { Environment } from '@kbn/apm-plugin/common/environment_rt';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { sortBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ApmApiError } from '../../common/apm_api_supertest';

type Instance = ReturnType<ReturnType<typeof apm.service>['instance']>;
type Transaction = ReturnType<Instance['transaction']>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  // for EQL sequences to work, events need a slight time offset,
  // as ES will sort based on @timestamp. to acommodate this offset
  // we also add a little bit of a buffer to the requested time range
  const endWithOffset = end + 100000;

  async function fetchTraceSamples({
    query,
    type,
    environment,
  }: {
    query: string;
    type: TraceSearchType;
    environment: Environment;
  }) {
    return apmApiClient.readUser({
      endpoint: `GET /internal/apm/traces/find`,
      params: {
        query: {
          query,
          type,
          start: new Date(start).toISOString(),
          end: new Date(endWithOffset).toISOString(),
          environment,
        },
      },
    });
  }

  function fetchTraces(samples: Array<{ traceId: string; transactionId: string }>) {
    if (!samples.length) {
      return [];
    }

    return Promise.all(
      samples.map(async ({ traceId }) => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/traces/{traceId}`,
          params: {
            path: { traceId },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(endWithOffset).toISOString(),
            },
          },
        });
        return response.body.traceDocs;
      })
    );
  }

  registry.when('Find traces when traces do not exist', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await fetchTraceSamples({
        query: '',
        type: TraceSearchType.kql,
        environment: ENVIRONMENT_ALL.value,
      });

      expect(response.status).to.be(200);
      expect(response.body).to.eql({
        samples: [],
      });
    });
  });

  registry.when('Find traces when traces exist', { config: 'basic', archives: [] }, () => {
    before(() => {
      const java = apm
        .service({ name: 'java', environment: 'production', agentName: 'java' })
        .instance('java');

      const node = apm
        .service({ name: 'node', environment: 'development', agentName: 'nodejs' })
        .instance('node');

      const python = apm
        .service({ name: 'python', environment: 'production', agentName: 'python' })
        .instance('python');

      function generateTrace(timestamp: number, order: Instance[], db?: 'elasticsearch' | 'redis') {
        return order
          .concat()
          .reverse()
          .reduce<Transaction | undefined>((prev, instance, index) => {
            const invertedIndex = order.length - index - 1;

            const duration = 50;
            const time = timestamp + invertedIndex * 10;

            const transaction: Transaction = instance
              .transaction({ transactionName: `GET /${instance.fields['service.name']!}/api` })
              .timestamp(time)
              .duration(duration);

            if (prev) {
              const next = order[invertedIndex + 1].fields['service.name']!;
              transaction.children(
                instance
                  .span({ spanName: `GET ${next}/api`, spanType: 'external', spanSubtype: 'http' })
                  .destination(next)
                  .duration(duration)
                  .timestamp(time + 1)
                  .children(prev)
              );
            } else if (db) {
              transaction.children(
                instance
                  .span({ spanName: db, spanType: 'db', spanSubtype: db })
                  .destination(db)
                  .duration(duration)
                  .timestamp(time + 1)
              );
            }

            return transaction;
          }, undefined)!;
      }

      return synthtraceEsClient.index(
        timerange(start, end)
          .interval('15m')
          .rate(1)
          .generator((timestamp) => {
            return [
              generateTrace(timestamp, [java, node]),
              generateTrace(timestamp, [node, java], 'redis'),
              generateTrace(timestamp, [python], 'redis'),
              generateTrace(timestamp, [python, node, java], 'elasticsearch'),
              generateTrace(timestamp, [java, python, node]),
            ];
          })
      );
    });

    describe('when using KQL', () => {
      describe('and the query is empty', () => {
        it('returns all trace samples', async () => {
          const {
            body: { samples },
          } = await fetchTraceSamples({
            query: '',
            type: TraceSearchType.kql,
            environment: 'ENVIRONMENT_ALL',
          });

          expect(samples.length).to.eql(5);
        });
      });

      describe('and query is set', () => {
        it('returns the relevant traces', async () => {
          const {
            body: { samples },
          } = await fetchTraceSamples({
            query: 'span.destination.service.resource:elasticsearch',
            type: TraceSearchType.kql,
            environment: 'ENVIRONMENT_ALL',
          });

          expect(samples.length).to.eql(1);
        });
      });
    });

    describe('when using EQL', () => {
      describe('and the query is invalid', () => {
        it.skip('returns a 400', async function () {
          try {
            await fetchTraceSamples({
              query: '',
              type: TraceSearchType.eql,
              environment: 'ENVIRONMENT_ALL',
            });
            this.fail();
          } catch (error: unknown) {
            const apiError = error as ApmApiError;
            expect(apiError.res.status).to.eql(400);
          }
        });
      });

      describe('and the query is set', () => {
        it('returns the correct trace samples for transaction sequences', async () => {
          const {
            body: { samples },
          } = await fetchTraceSamples({
            query: `sequence by trace.id
                [ transaction where service.name == "java" ]
                [ transaction where service.name == "node" ]`,
            type: TraceSearchType.eql,
            environment: 'ENVIRONMENT_ALL',
          });

          const traces = await fetchTraces(samples);

          expect(traces.length).to.eql(2);

          const mapped = traces.map((traceDocs) => {
            return sortBy(traceDocs, '@timestamp')
              .filter((doc) => doc.processor.event === 'transaction')
              .map((doc) => doc.service.name);
          });

          expect(mapped).to.eql([
            ['java', 'node'],
            ['java', 'python', 'node'],
          ]);
        });
      });

      it('returns the correct trace samples for join sequences', async () => {
        const {
          body: { samples },
        } = await fetchTraceSamples({
          query: `sequence by trace.id
              [ span where service.name == "java" ] by span.id
              [ transaction where service.name == "python" ] by parent.id`,
          type: TraceSearchType.eql,
          environment: 'ENVIRONMENT_ALL',
        });

        const traces = await fetchTraces(samples);

        expect(traces.length).to.eql(1);

        const mapped = traces.map((traceDocs) => {
          return sortBy(traceDocs, '@timestamp')
            .filter((doc) => doc.processor.event === 'transaction')
            .map((doc) => doc.service.name);
        });

        expect(mapped).to.eql([['java', 'python', 'node']]);
      });

      it('returns the correct trace samples for exit spans', async () => {
        const {
          body: { samples },
        } = await fetchTraceSamples({
          query: `sequence by trace.id
              [ transaction where service.name == "python" ]
              [ span where span.destination.service.resource == "redis" ]`,
          type: TraceSearchType.eql,
          environment: 'ENVIRONMENT_ALL',
        });

        const traces = await fetchTraces(samples);

        expect(traces.length).to.eql(1);

        const mapped = traces.map((traceDocs) => {
          return sortBy(traceDocs, '@timestamp')
            .filter(
              (doc) => doc.processor.event === 'transaction' || doc.processor.event === 'span'
            )
            .map((doc) => {
              if (doc.span && 'destination' in doc.span) {
                return doc.span.destination!.service.resource;
              }
              return doc.service.name;
            });
        });

        expect(mapped).to.eql([['python', 'redis']]);
      });
    });

    after(() => synthtraceEsClient.clean());
  });
}
