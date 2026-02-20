/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/synthtrace';
import {
  generateGetTracesApmDataset,
  DEFAULT_TRACE_CONFIGS,
  generateCorrelatedLogsData,
  createLogSequence,
  type CorrelatedLogEvent,
} from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_TRACES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface GetTracesToolResult extends OtherResult {
  data: {
    traces: {
      items: Record<string, unknown>[];
      isTruncated?: boolean;
    }[];
  };
}

const START = 'now-10m';
const END = 'now';

async function indexCorrelatedLogs({
  logsEsClient,
  logs,
}: {
  logsEsClient: LogsSynthtraceEsClient;
  logs: CorrelatedLogEvent[];
}): Promise<void> {
  const range = timerange('now-5m', 'now');
  const { client, generator } = generateCorrelatedLogsData({ range, logsEsClient, logs });
  await client.index(generator);
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const range = timerange(START, END);

  describe(`tool: ${OBSERVABILITY_GET_TRACES_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      logsSynthtraceEsClient = await synthtrace.createLogsSynthtraceEsClient();

      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();

      const apmData = generateGetTracesApmDataset({
        range,
        apmEsClient: apmSynthtraceEsClient,
        traces: DEFAULT_TRACE_CONFIGS,
      });

      await apmData.client.index(apmData.generator);
    });

    after(async () => {
      if (apmSynthtraceEsClient) {
        await apmSynthtraceEsClient.clean();
      }
      if (logsSynthtraceEsClient) {
        await logsSynthtraceEsClient.clean();
      }
    });

    describe('when trace.id is provided', () => {
      before(async () => {
        const { traceId, serviceName, environment } = DEFAULT_TRACE_CONFIGS[0];

        const correlatedLogs = createLogSequence({
          service: serviceName,
          correlation: {
            'trace.id': traceId,
            'request.id': `req-${traceId}`,
          },
          defaults: {
            'service.environment': environment,
          },
          logs: [
            { 'log.level': 'info', message: 'Checkout request received' },
            { 'log.level': 'debug', message: 'Calling downstream cart service' },
            { 'log.level': 'error', message: 'Database query failed: timeout' },
            { 'log.level': 'warn', message: 'Retrying operation' },
            { 'log.level': 'info', message: 'Checkout completed' },
          ],
        });
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: correlatedLogs,
        });
      });

      it('returns a single trace with Observability documents(logs, transactions, spans, and errors)', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
          id: OBSERVABILITY_GET_TRACES_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: `trace.id: "${DEFAULT_TRACE_CONFIGS[0].traceId}"`,
          },
        });
        const { traces } = results[0].data;
        expect(traces).to.have.length(1);

        const trace = traces[0];
        expect(trace.items.length).to.be.greaterThan(0);
      });

      it('respects maxTraces', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
          id: OBSERVABILITY_GET_TRACES_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'transaction.duration.us > 5',
            maxTraces: 1,
          },
        });

        const { traces } = results[0].data;
        expect(traces).to.have.length(1);
      });

      it('respects maxDocsPerTrace and indicates truncation', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
          id: OBSERVABILITY_GET_TRACES_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: `trace.id: "${DEFAULT_TRACE_CONFIGS[0].traceId}"`,
            maxDocsPerTrace: 1,
          },
        });

        const { traces } = results[0].data;
        expect(traces).to.have.length(1);

        const trace = traces[0];
        expect(trace.items).to.have.length(1);
        expect(trace.isTruncated).to.be(true);
      });

      it('returns no traces if the trace does not exist', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
          id: OBSERVABILITY_GET_TRACES_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'trace.id: "trace-does-not-exist"',
          },
        });

        const { traces } = results[0].data;
        expect(traces).to.have.length(0);
      });

      it('does not return traces when the query matches no documents', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
          id: OBSERVABILITY_GET_TRACES_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "non-existing-service"',
          },
        });
        const { traces } = results[0].data;
        expect(traces.length).to.be(0);
      });

      it('returns traces for slow transactions', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
          id: OBSERVABILITY_GET_TRACES_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'transaction.duration.us > 5',
          },
        });
        const { traces } = results[0].data;
        expect(traces.length).to.be.greaterThan(0);
      });

      it('returns no traces when the time range excludes the data', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
          id: OBSERVABILITY_GET_TRACES_TOOL_ID,
          params: {
            start: 'now-2h',
            end: 'now-1h',
            kqlFilter: `trace.id: "${DEFAULT_TRACE_CONFIGS[0].traceId}"`,
          },
        });

        const { traces } = results[0].data;
        expect(traces).to.have.length(0);
      });
    });
  });
}
