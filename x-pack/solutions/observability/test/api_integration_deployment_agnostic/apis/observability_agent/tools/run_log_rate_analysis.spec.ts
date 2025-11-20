/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { LOG_RATE_ANALYSIS_TYPE, type LogRateAnalysisType } from '@kbn/aiops-log-rate-analysis';
import type { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID } from '@kbn/observability-agent-plugin/server/tools/run_log_rate_analysis/run_log_rate_analysis';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import {
  LOG_RATE_ANALYSIS_SPIKE_BASELINE_WINDOW,
  LOG_RATE_ANALYSIS_SPIKE_DATA_STREAM,
  LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW,
  createLogRateAnalysisSpikeData,
} from '../utils/synthtrace_scenarios';

interface RunLogRateAnalysisToolResult {
  type: ToolResultType.other;
  data: {
    analysisType: LogRateAnalysisType;
    items: Array<{
      score: number;
      fieldType: string;
      fieldName: string;
      fieldValue: string;
      message: string;
      change: {
        baseline: number;
        deviation: number;
      };
    }>;
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      agentBuilderApiClient = createAgentBuilderApiClient(supertest);

      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
      await createLogRateAnalysisSpikeData({ logsSynthtraceEsClient });
    });

    after(async () => {
      await logsSynthtraceEsClient.clean();
    });

    describe('when logs contain a spike in timeout errors', () => {
      let toolResults: RunLogRateAnalysisToolResult[];

      before(async () => {
        toolResults = await agentBuilderApiClient.executeTool<RunLogRateAnalysisToolResult>({
          id: OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
          params: {
            index: LOG_RATE_ANALYSIS_SPIKE_DATA_STREAM,
            baseline: LOG_RATE_ANALYSIS_SPIKE_BASELINE_WINDOW,
            deviation: LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW,
          },
        });
      });

      it('shows that the change is caused by log.level=error', () => {
        const { fieldName, fieldValue } = toolResults[0].data.items[0];
        expect(fieldName).to.be('log.level');
        expect(fieldValue).to.be('error');
      });

      it('classifies the analysis as a spike', () => {
        expect(toolResults[0].data.analysisType).to.be(LOG_RATE_ANALYSIS_TYPE.SPIKE);
      });

      it('shows that the log rate increased from baseline to deviation', () => {
        const { baseline, deviation } = toolResults[0].data.items[0].change;
        expect(deviation).to.be.greaterThan(baseline);
      });
    });

    describe('when baseline and deviation time ranges are swapped', () => {
      let toolResults: RunLogRateAnalysisToolResult[];

      before(async () => {
        toolResults = await agentBuilderApiClient.executeTool<RunLogRateAnalysisToolResult>({
          id: OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
          params: {
            index: LOG_RATE_ANALYSIS_SPIKE_DATA_STREAM,
            baseline: LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW, // note: swapped
            deviation: LOG_RATE_ANALYSIS_SPIKE_BASELINE_WINDOW, // note: swapped
          },
        });
      });

      it('finds a single significant item', () => {
        expect(toolResults[0].data.items.length).to.be(1);
      });

      it('shows that the change is caused by log.level=error', () => {
        const item = toolResults[0].data.items[0];
        expect(item.fieldName).to.be('log.level');
        expect(item.fieldValue).to.be('error');
      });

      it('classifies the analysis as a dip', () => {
        expect(toolResults[0].data.analysisType).to.be(LOG_RATE_ANALYSIS_TYPE.DIP);
      });

      it('shows that the log rate decreased from baseline to deviation', () => {
        const { baseline, deviation } = toolResults[0].data.items[0].change;
        expect(baseline).to.be.greaterThan(deviation);
      });
    });
  });
}
