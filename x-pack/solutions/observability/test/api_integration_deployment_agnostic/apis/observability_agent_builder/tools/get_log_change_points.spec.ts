/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import {
  generateLogChangePointsData,
  LOG_CHANGE_POINTS_ANALYSIS_WINDOW,
  LOG_CHANGE_POINTS_DATA_STREAM,
} from '@kbn/synthtrace';
import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_log_change_points/tool';
import type { ChangePoint } from '@kbn/observability-agent-builder-plugin/server/utils/get_change_points';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface ToolResult {
  type: ToolResultType.other;
  data: {
    changePoints: ChangePoint[];
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
      const { client, generator } = generateLogChangePointsData({
        logsEsClient: logsSynthtraceEsClient,
      });
      await client.index(generator);
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
            index: LOG_CHANGE_POINTS_DATA_STREAM,
          },
        });
        logChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should return change points', () => {
        expect(logChangePoints).to.be.an('array');
        expect(logChangePoints.length).to.be.greaterThan(0);
      });

      it('should detect a change in error logs', () => {
        expect(logChangePoints.length).to.be.greaterThan(0);
        const change = logChangePoints.find((cp: ChangePoint) =>
          ['spike', 'dip', 'step_change', 'trend_change', 'distribution_change'].includes(
            cp.changes?.type
          )
        );
        expect(change).to.be.ok();
        expect(change).to.have.property('timeSeries');
        expect(change?.timeSeries?.length).to.be.greaterThan(0);
        expect(change?.timeSeries?.[0]).to.have.property('x');
        expect(change?.timeSeries?.[0]).to.have.property('y');
      });

      it('should detect stationary patterns in logs', () => {
        const stationary = logChangePoints.find(
          (cp: ChangePoint) => cp.changes?.type === 'stationary'
        );
        expect(stationary).to.be.ok();
        expect(stationary).not.to.have.property('timeSeries');
      });
    });

    describe('when resolving the logs index automatically', () => {
      let logChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
          params: {
            start: LOG_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: LOG_CHANGE_POINTS_ANALYSIS_WINDOW.end,
          },
        });

        logChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should still detect changes without an explicit index', () => {
        expect(logChangePoints.length).to.be.greaterThan(0);
        const hasChange = logChangePoints.some((cp: ChangePoint) =>
          ['spike', 'dip', 'step_change', 'trend_change', 'distribution_change'].includes(
            cp.changes?.type as string
          )
        );
        expect(hasChange).to.be(true);
      });
    });

    describe('when filtering logs with kql', () => {
      let logChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
          params: {
            start: LOG_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: LOG_CHANGE_POINTS_ANALYSIS_WINDOW.end,
            index: LOG_CHANGE_POINTS_DATA_STREAM,
            kqlFilter: 'log.level: info',
          },
        });

        logChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should not detect changes when only stable info logs are included', () => {
        const hasChange = logChangePoints.some((cp: ChangePoint) =>
          ['spike', 'dip', 'step_change', 'trend_change', 'distribution_change'].includes(
            cp.changes?.type
          )
        );
        expect(hasChange).to.be(false);
      });

      it('should still detect stationary patterns in info logs', () => {
        const stationary = logChangePoints.some(
          (cp: ChangePoint) => cp.changes?.type === 'stationary'
        );
        expect(stationary).to.be(true);
      });
    });
  });
}
