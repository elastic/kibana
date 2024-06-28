/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { TraceSearchType } from '@kbn/apm-plugin/common/trace_explorer';
import { Environment } from '@kbn/apm-plugin/common/environment_rt';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { sortBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ApmApiError } from '../../common/apm_api_supertest';
import { generateTrace } from './generate_trace';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

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

  function fetchTraces(traceSamples: Array<{ traceId: string; transactionId: string }>) {
    if (!traceSamples.length) {
      return [];
    }

    return Promise.all(
      traceSamples.map(async ({ traceId, transactionId }) => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/traces/{traceId}`,
          params: {
            path: { traceId },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(endWithOffset).toISOString(),
              entryTransactionId: transactionId,
            },
          },
        });
        return response.body.traceItems.traceDocs;
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
        traceSamples: [],
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/177543
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

      return apmSynthtraceEsClient.index(
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
            body: { traceSamples },
          } = await fetchTraceSamples({
            query: '',
            type: TraceSearchType.kql,
            environment: 'ENVIRONMENT_ALL',
          });

          expect(traceSamples.length).to.eql(5);
        });
      });

      describe('and query is set', () => {
        it('returns the relevant traces', async () => {
          const {
            body: { traceSamples },
          } = await fetchTraceSamples({
            query: 'span.destination.service.resource:elasticsearch',
            type: TraceSearchType.kql,
            environment: 'ENVIRONMENT_ALL',
          });

          expect(traceSamples.length).to.eql(1);
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
            body: { traceSamples },
          } = await fetchTraceSamples({
            query: `sequence by trace.id
                [ transaction where service.name == "java" ]
                [ transaction where service.name == "node" ]`,
            type: TraceSearchType.eql,
            environment: 'ENVIRONMENT_ALL',
          });

          const traces = await fetchTraces(traceSamples);

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
          body: { traceSamples },
        } = await fetchTraceSamples({
          query: `sequence by trace.id
              [ span where service.name == "java" ] by span.id
              [ transaction where service.name == "python" ] by parent.id`,
          type: TraceSearchType.eql,
          environment: 'ENVIRONMENT_ALL',
        });

        const traces = await fetchTraces(traceSamples);

        expect(traces.length).to.eql(1);

        const mapped = traces.map((traceDocs) => {
          return sortBy(traceDocs, '@timestamp')
            .filter((doc) => doc.processor.event === 'transaction')
            .map((doc) => doc.service.name);
        });

        expect(mapped).to.eql([['java', 'python', 'node']]);
      });
    });

    after(() => apmSynthtraceEsClient.clean());
  });
}
