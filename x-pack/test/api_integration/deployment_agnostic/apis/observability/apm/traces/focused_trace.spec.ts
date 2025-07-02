/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import type { Environment } from '@kbn/apm-plugin/common/environment_rt';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { TraceSearchType } from '@kbn/apm-plugin/common/trace_explorer';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { generateTrace } from './generate_trace';

type FocusedTraceResponseType = APIReturnType<'GET /internal/apm/traces/{traceId}/{docId}'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  const endWithOffset = end + 100000;

  describe('traces', () => {
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

    async function fetchFocusedTrace({
      traceId,
      docId,
    }: {
      traceId: string;
      docId: string | undefined;
    }) {
      if (!docId) {
        return undefined;
      }
      return apmApiClient.readUser({
        endpoint: `GET /internal/apm/traces/{traceId}/{docId}`,
        params: {
          path: { traceId, docId },
          query: {
            start: new Date(start).toISOString(),
            end: new Date(endWithOffset).toISOString(),
          },
        },
      });
    }

    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
    });

    after(() => apmSynthtraceEsClient.clean());

    describe('when traces exist', () => {
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
            .generator((timestamp) =>
              generateTrace(timestamp, [python, node, java], 'elasticsearch')
            )
        );
      });

      describe('focused trace', () => {
        let traceId: string;
        let focusedTrace: FocusedTraceResponseType | undefined;
        let rootTransactionId: string | undefined;
        before(async () => {
          const response = await fetchTraceSamples({
            query: '',
            type: TraceSearchType.kql,
            environment: ENVIRONMENT_ALL.value,
          });

          expect(response.status).to.be(200);
          traceId = response.body.traceSamples[0].traceId;
          const focusedTraceResponse = await fetchFocusedTrace({
            traceId,
            docId: response.body.traceSamples[0].transactionId,
          });
          expect(focusedTraceResponse?.status).to.be(200);
          focusedTrace = focusedTraceResponse?.body;
          rootTransactionId = focusedTrace?.traceItems?.rootDoc?.id;
        });

        describe('focus on root transaction', () => {
          it('returns same root transaction and focused item', async () => {
            expect(focusedTrace?.traceItems?.rootDoc?.id).to.eql(
              focusedTrace?.traceItems?.focusedTraceDoc?.id
            );
          });

          it('does not have parent item', () => {
            expect(focusedTrace?.traceItems?.parentDoc).to.be(undefined);
          });

          it('has 2 children', () => {
            expect(focusedTrace?.traceItems?.focusedTraceTree.length).to.eql(1);
            expect(focusedTrace?.traceItems?.focusedTraceTree?.[0]?.children?.length).to.eql(1);
          });

          it('returns trace summary', () => {
            expect(focusedTrace?.summary).to.eql({
              services: 3,
              traceEvents: 6,
              errors: 0,
            });
          });
        });

        describe('focus on node transaction', () => {
          let nodeParentSpanId: string | undefined;
          let nodeTransactionId: string | undefined;
          before(async () => {
            nodeParentSpanId = focusedTrace?.traceItems?.focusedTraceTree?.[0]?.traceDoc?.id;
            nodeTransactionId =
              focusedTrace?.traceItems?.focusedTraceTree?.[0]?.children?.[0]?.traceDoc?.id;
            const focusedTraceResponse = await fetchFocusedTrace({
              traceId,
              docId: nodeTransactionId,
            });
            expect(focusedTraceResponse?.status).to.be(200);
            focusedTrace = focusedTraceResponse?.body;
          });

          it('focus on node transaction', () => {
            expect(focusedTrace?.traceItems?.focusedTraceDoc?.id).to.eql(nodeTransactionId);
          });

          it('returns root transaction', async () => {
            expect(focusedTrace?.traceItems?.rootDoc?.id).to.eql(rootTransactionId);
          });

          it('returns parent span', () => {
            expect(focusedTrace?.traceItems?.parentDoc?.id).to.eql(nodeParentSpanId);
          });

          it('has 2 children', () => {
            expect(focusedTrace?.traceItems?.focusedTraceTree.length).to.eql(1);
            expect(focusedTrace?.traceItems?.focusedTraceTree?.[0]?.children?.length).to.eql(1);
          });
        });

        describe('focused item not found', () => {
          before(async () => {
            const focusedTraceResponse = await fetchFocusedTrace({
              traceId,
              docId: 'bar',
            });
            expect(focusedTraceResponse?.status).to.be(200);
            focusedTrace = focusedTraceResponse?.body;
          });

          it('returns trace summary', () => {
            expect(focusedTrace?.summary).to.eql({
              services: 3,
              traceEvents: 6,
              errors: 0,
            });
          });

          it('returns empty focused trace', () => {
            expect(focusedTrace?.traceItems).to.be(undefined);
          });
        });

        describe('trace not found', () => {
          before(async () => {
            const focusedTraceResponse = await fetchFocusedTrace({
              traceId: 'foo',
              docId: 'bar',
            });
            expect(focusedTraceResponse?.status).to.be(200);
            focusedTrace = focusedTraceResponse?.body;
          });

          it('returns trace summary', () => {
            expect(focusedTrace?.summary).to.eql({
              services: 0,
              traceEvents: 0,
              errors: 0,
            });
          });

          it('returns empty focused trace', () => {
            expect(focusedTrace?.traceItems).to.be(undefined);
          });
        });
      });
    });
  });
}
