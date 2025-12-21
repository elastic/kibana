/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_change_points/get_log_change_points';
import type { ChangePoint } from '@kbn/observability-agent-builder-plugin/server/utils/get_change_points';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import {
  LOG_CHANGE_POINTS_ANALYSIS_WINDOW,
  LOG_CHANGE_POINTS_DATA_STREAM,
  createLogChangePointsData,
} from '../utils/synthtrace_scenarios/create_log_change_points_data';

interface ToolResult {
  type: ToolResultType.other;
  data: {
    changePoints: {
      logs: ChangePoint[];
    };
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      agentBuilderApiClient = createAgentBuilderApiClient(supertest);
      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
      await createLogChangePointsData({ logsSynthtraceEsClient });
    });

    after(async () => {
      await logsSynthtraceEsClient.clean();
    });

    describe('when retrieving log change points', () => {
      let logChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
          params: {
            start: LOG_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: LOG_CHANGE_POINTS_ANALYSIS_WINDOW.end,
            logs: [
              {
                index: LOG_CHANGE_POINTS_DATA_STREAM,
                name: 'test-logs',
              },
            ],
          },
        });
        logChangePoints = toolResults[0]?.data?.changePoints?.logs ?? [];
      });

      it('should detect spike in error logs', () => {
        expect(logChangePoints.length).to.be.greaterThan(0);
        const spike = logChangePoints.find((cp: ChangePoint) => cp.changes?.type === 'spike');
        expect(spike).to.be.ok();
      });

      it('should include time series data for visualization', () => {
        logChangePoints.forEach((cp: ChangePoint) => {
          expect(cp).to.have.property('over_time');
          expect(cp.over_time.length).to.be.greaterThan(0);
          expect(cp.over_time[0]).to.have.property('x');
          expect(cp.over_time[0]).to.have.property('y');
        });
      });
    });
  });
}
