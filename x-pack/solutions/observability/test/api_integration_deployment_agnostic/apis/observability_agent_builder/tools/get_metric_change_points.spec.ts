/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  type ApmSynthtraceEsClient,
  generateMetricChangePointsData,
  METRIC_CHANGE_POINTS_ANALYSIS_WINDOW,
  METRIC_CHANGE_POINTS_INDEX,
} from '@kbn/synthtrace';
import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_metric_change_points/tool';
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

  describe(`tool: ${OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      agentBuilderApiClient = createAgentBuilderApiClient(supertest);
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      const { client, generator } = generateMetricChangePointsData({
        apmEsClient: apmSynthtraceEsClient,
      });
      await client.index(generator);
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    describe('when retrieving metric change points', () => {
      let metricChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
          params: {
            start: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.end,
            index: METRIC_CHANGE_POINTS_INDEX,
          },
        });
        metricChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should detect spike in metrics', () => {
        expect(metricChangePoints.length).to.be.greaterThan(0);
        const spike = metricChangePoints.find((cp: ChangePoint) => cp.changes?.type === 'spike');
        expect(spike).to.be.ok();
      });

      it('should include time series data for visualization', () => {
        metricChangePoints.forEach((cp: ChangePoint) => {
          expect(cp).to.have.property('timeSeries');
          expect(cp?.timeSeries?.length).to.be.greaterThan(0);
          expect(cp?.timeSeries?.[0]).to.have.property('x');
          expect(cp?.timeSeries?.[0]).to.have.property('y');
        });
      });
    });

    describe('when using avg aggregation on a numeric field', () => {
      let metricChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
          params: {
            start: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.end,
            index: METRIC_CHANGE_POINTS_INDEX,
            aggregation: {
              field: 'system.memory.actual.free',
              type: 'avg',
            },
          },
        });
        metricChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should detect change in avg metric values', () => {
        expect(metricChangePoints.length).to.be.greaterThan(0);
        const changePoint = metricChangePoints.find(
          (cp: ChangePoint) => cp.changes?.type === 'spike'
        );
        expect(changePoint).to.be.ok();
      });
    });

    describe('when resolving the metrics index automatically', () => {
      let metricChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
          params: {
            start: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.end,
          },
        });

        metricChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should still detect spikes without an explicit index', () => {
        expect(metricChangePoints.length).to.be.greaterThan(0);
        const spike = metricChangePoints.find((cp: ChangePoint) => cp.changes?.type === 'spike');
        expect(spike).to.be.ok();
      });
    });

    describe('when filtering metrics with kql', () => {
      let metricChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
          params: {
            start: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.end,
            index: METRIC_CHANGE_POINTS_INDEX,
            aggregation: {
              field: 'system.memory.actual.free',
              type: 'avg',
            },
            kqlFilter: 'system.memory.actual.free:10000',
          },
        });

        metricChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should not report spikes once the spike window is filtered out', () => {
        const spike = metricChangePoints.find((cp: ChangePoint) => cp.changes?.type === 'spike');
        expect(spike).to.be(undefined);
      });
    });

    describe('when grouping by multiple dimensions', () => {
      let metricChangePoints: ChangePoint[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
          params: {
            start: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.end,
            index: METRIC_CHANGE_POINTS_INDEX,
            groupBy: ['service.name', 'service.environment'],
          },
        });

        metricChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should keep the group key values on the change point', () => {
        expect(metricChangePoints.length).to.be.greaterThan(0);
        const spike = metricChangePoints.find((cp: ChangePoint) => cp.changes?.type === 'spike');
        expect(spike?.key).to.contain('test-service');
        expect(spike?.key).to.contain('test');
      });
    });
  });
}
