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
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { ApmApiClient } from '../../../../services/apm_api';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { generateLargeTrace } from './generate_large_trace';

const start = new Date('2023-01-01T00:00:00.000Z').getTime();
const end = new Date('2023-01-01T00:01:00.000Z').getTime() - 1;
const rootTransactionName = 'Long trace';
const environment = 'unified_long_trace_scenario';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const es = getService('es');

  describe('Unified large trace', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    describe('when the trace is large (>15.000 items)', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
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
        describe('ecsOnly: true', () => {
          let response: APIReturnType<'GET /internal/apm/unified_traces/{traceId}'>;

          before(async () => {
            response = await getUnifiedTrace({ es, apmApiClient, ecsOnly: true });
          });

          it('returns traceDocsTotal greater than the limit', () => {
            expect(response.traceDocsTotal).to.be.greaterThan(15000);
            expect(response.traceDocsTotal).to.be.lessThan(16000);
          });

          it('returns only maxTraceItems trace items', () => {
            expect(response.traceItems.length).to.be(5000);
          });

          it('returns maxTraceItems correctly', () => {
            expect(response.maxTraceItems).to.be(5000);
          });

          it('does not include exceedMax in the response', () => {
            expect(response).not.to.have.property('exceedMax');
          });
        });

        describe('ecsOnly: false (unified query)', () => {
          let response: APIReturnType<'GET /internal/apm/unified_traces/{traceId}'>;

          before(async () => {
            response = await getUnifiedTrace({ es, apmApiClient, ecsOnly: false });
          });

          it('returns traceDocsTotal greater than the limit', () => {
            expect(response.traceDocsTotal).to.be.greaterThan(15000);
            expect(response.traceDocsTotal).to.be.lessThan(16000);
          });

          it('returns only maxTraceItems trace items', () => {
            expect(response.traceItems.length).to.be(5000);
          });

          it('returns maxTraceItems correctly', () => {
            expect(response.maxTraceItems).to.be(5000);
          });

          it('does not include exceedMax in the response', () => {
            expect(response).not.to.have.property('exceedMax');
          });
        });
      });
    });
  });
}

async function getRootTransaction(es: Client) {
  const res = await es.search<{ trace: { id: string }; transaction: { id: string } }>({
    index: 'traces-apm*',
    _source: [TRACE_ID, TRANSACTION_ID],
    query: {
      bool: {
        filter: [
          { term: { [PROCESSOR_EVENT]: 'transaction' } },
          { term: { [SERVICE_ENVIRONMENT]: environment } },
        ],
        must_not: [{ exists: { field: PARENT_ID } }],
      },
    },
  });

  return {
    traceId: res.hits.hits[0]?._source?.trace.id as string,
    transactionId: res.hits.hits[0]?._source?.transaction.id as string,
  };
}

async function getUnifiedTrace({
  es,
  apmApiClient,
  ecsOnly,
}: {
  es: Client;
  apmApiClient: ApmApiClient;
  ecsOnly: boolean;
}) {
  const { traceId, transactionId } = await getRootTransaction(es);

  const res = await apmApiClient.readUser({
    endpoint: `GET /internal/apm/unified_traces/{traceId}`,
    params: {
      path: { traceId },
      query: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        entryTransactionId: transactionId,
        ecsOnly,
      },
    },
  });

  return res.body;
}
