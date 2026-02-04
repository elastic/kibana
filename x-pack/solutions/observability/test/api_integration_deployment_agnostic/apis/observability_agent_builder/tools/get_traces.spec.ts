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
  generateGetTracesLogsData,
  DEFAULT_TRACE_CONFIGS,
} from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_TRACES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { TraceSequence } from '@kbn/observability-agent-builder-plugin/server/tools/get_traces/types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface GetTracesToolResult extends OtherResult {
  data: {
    sequences: TraceSequence[];
  };
}

const START = 'now-10m';
const END = 'now';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_TRACES_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();

      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();

      const range = timerange(START, END);

      const apmData = generateGetTracesApmDataset({
        range,
        apmEsClient: apmSynthtraceEsClient,
        traces: DEFAULT_TRACE_CONFIGS,
      });

      await apmData.client.index(apmData.generator);

      const logsData = generateGetTracesLogsData({
        range,
        logsEsClient: logsSynthtraceEsClient,
        config: DEFAULT_TRACE_CONFIGS[0],
      });
      await logsData.client.index(logsData.generator);
    });

    after(async () => {
      if (apmSynthtraceEsClient) {
        await apmSynthtraceEsClient.clean();
      }
      if (logsSynthtraceEsClient) {
        await logsSynthtraceEsClient.clean();
      }
    });

    it('returns a single trace sequence with APM events and correlated logs', async () => {
      const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
        id: OBSERVABILITY_GET_TRACES_TOOL_ID,
        params: {
          start: START,
          end: END,
          traceId: DEFAULT_TRACE_CONFIGS[0].traceId,
        },
      });
      const { sequences } = results[0].data;
      // when traceId is provided, should return exactly one sequence
      expect(sequences).to.have.length(1);

      const sequence = sequences[0];
      expect(sequence.correlation_identifier.identifier.field).to.be('trace.id');
      expect(sequence.correlation_identifier.identifier.value).to.be(
        DEFAULT_TRACE_CONFIGS[0].traceId
      );
      expect(sequence.traceItems.length).to.be.greaterThan(0);
      expect(sequence.logs.length).to.be.greaterThan(0);
      expect(sequence.errorItems.length).to.be.greaterThan(0);
    });

    it('returns an empty sequence if the trace does not exist', async () => {
      const results = await agentBuilderApiClient.executeTool<GetTracesToolResult>({
        id: OBSERVABILITY_GET_TRACES_TOOL_ID,
        params: {
          start: START,
          end: END,
          traceId: 'trace-does-not-exist',
        },
      });

      const { correlation_identifier, traceItems, logs, errorItems } = results[0].data.sequences[0];
      expect(correlation_identifier.identifier.field).to.be('trace.id');
      expect(correlation_identifier.identifier.value).to.be('trace-does-not-exist');
      expect(traceItems).to.have.length(0);
      expect(logs).to.have.length(0);
      expect(errorItems).to.have.length(0);
    });
  });
}
