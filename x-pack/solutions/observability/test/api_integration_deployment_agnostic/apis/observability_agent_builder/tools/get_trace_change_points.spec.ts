/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_trace_change_points/tool';
import type { ChangePoint } from '@kbn/observability-agent-builder-plugin/server/utils/get_change_points';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import {
  SERVICE_NAME,
  TRACE_CHANGE_POINTS_ANALYSIS_WINDOW,
  createTraceChangePointsData,
} from '../utils/synthtrace_scenarios/create_trace_change_points_data';

interface ToolResult {
  type: ToolResultType.other;
  data: {
    changePoints: ChangePoint[];
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      agentBuilderApiClient = createAgentBuilderApiClient(supertest);
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await createTraceChangePointsData({ apmSynthtraceEsClient });
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    describe('when retrieving trace change points', () => {
      let traceChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID,
          params: {
            start: TRACE_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: TRACE_CHANGE_POINTS_ANALYSIS_WINDOW.end,
          },
        });
        traceChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should return results grouped by service.name', () => {
        const serviceNames = traceChangePoints.find((cp: ChangePoint) => cp.key === SERVICE_NAME);
        expect(serviceNames).to.not.be(undefined);
      });

      it('should include changes_latency, changes_throughput, and changes_failure_rate change points results', () => {
        traceChangePoints.forEach((cp: ChangePoint) => {
          expect(cp).to.have.property('changes_latency');
          expect(cp).to.have.property('changes_throughput');
          expect(cp).to.have.property('changes_failure_rate');
        });
      });

      it('should include time series data for visualization', () => {
        traceChangePoints.forEach((cp: ChangePoint) => {
          expect(cp).to.have.property('time_series');
        });
      });
    });
  });
}
