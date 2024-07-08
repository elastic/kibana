/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  SERVICE_ENVIRONMENT,
  TRANSACTION_ID,
  PARENT_ID,
} from '@kbn/apm-plugin/common/es_fields/apm';
import type { Client } from '@elastic/elasticsearch';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import expect from '@kbn/expect';
import { ApmApiClient } from '../../../common/config';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { generateLargeTrace } from './generate_large_trace';

const start = new Date('2023-01-01T00:00:00.000Z').getTime();
const end = new Date('2023-01-01T00:01:00.000Z').getTime() - 1;
const rootTransactionName = 'Long trace';
const environment = 'long_trace_scenario';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const es = getService('es');

  // FLAKY: https://github.com/elastic/kibana/issues/177660
  registry.when('Large trace', { config: 'basic', archives: [] }, () => {
    describe('when the trace is large (>15.000 items)', () => {
      before(() => {
        return generateLargeTrace({
          start,
          end,
          rootTransactionName,
          apmSynthtraceEsClient,
          repeaterFactor: 10,
          environment,
        });
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
      });

      describe('when maxTraceItems is 5000 (default)', () => {
        let trace: APIReturnType<'GET /internal/apm/traces/{traceId}'>;
        before(async () => {
          trace = await getTrace({ es, apmApiClient, maxTraceItems: 5000 });
        });

        it('and traceDocsTotal is correct', () => {
          expect(trace.traceItems.traceDocsTotal).to.be(15551);
        });

        it('and traceDocs is correct', () => {
          expect(trace.traceItems.traceDocs.length).to.be(5000);
        });

        it('and maxTraceItems is correct', () => {
          expect(trace.traceItems.maxTraceItems).to.be(5000);
        });

        it('and exceedsMax is correct', () => {
          expect(trace.traceItems.exceedsMax).to.be(true);
        });
      });

      describe('when maxTraceItems is 20000', () => {
        let trace: APIReturnType<'GET /internal/apm/traces/{traceId}'>;
        before(async () => {
          trace = await getTrace({ es, apmApiClient, maxTraceItems: 20000 });
        });

        it('and traceDocsTotal is correct', () => {
          expect(trace.traceItems.traceDocsTotal).to.be(15551);
        });

        it('and traceDocs is correct', () => {
          expect(trace.traceItems.traceDocs.length).to.be(15551);
        });

        it('and maxTraceItems is correct', () => {
          expect(trace.traceItems.maxTraceItems).to.be(20000);
        });

        it('and exceedsMax is correct', () => {
          expect(trace.traceItems.exceedsMax).to.be(false);
        });
      });
    });
  });
}

async function getRootTransaction(es: Client) {
  const params = {
    index: 'traces-apm*',
    _source: [TRACE_ID, TRANSACTION_ID],
    body: {
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: 'transaction' } },
            { term: { [SERVICE_ENVIRONMENT]: environment } },
          ],
          must_not: [{ exists: { field: PARENT_ID } }],
        },
      },
    },
  };

  interface Hit {
    trace: { id: string };
    transaction: { id: string };
  }

  const res = await es.search<Hit>(params);

  return {
    traceId: res.hits.hits[0]?._source?.trace.id as string,
    transactionId: res.hits.hits[0]?._source?.transaction.id as string,
  };
}

async function getTrace({
  es,
  apmApiClient,
  maxTraceItems,
}: {
  es: Client;
  apmApiClient: ApmApiClient;
  maxTraceItems?: number;
}) {
  const rootTransaction = await getRootTransaction(es);
  const res = await apmApiClient.readUser({
    endpoint: `GET /internal/apm/traces/{traceId}`,
    params: {
      path: { traceId: rootTransaction.traceId },
      query: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        entryTransactionId: rootTransaction.transactionId,
        maxTraceItems,
      },
    },
  });

  return res.body;
}
