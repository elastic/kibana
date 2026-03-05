/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import {
  type LogsSynthtraceEsClient,
  generateCascadingFailureData,
  indexAll,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_LOGS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { GetLogsToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_logs/tool';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const START = 'now-15m';
const END = 'now';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_LOGS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
      await logsSynthtraceEsClient.clean();

      await indexAll(
        generateCascadingFailureData({
          range: timerange(START, END),
          logsEsClient: logsSynthtraceEsClient,
        })
      );
    });

    after(async () => {
      await logsSynthtraceEsClient.clean();
    });

    it('returns expected response structure', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: { start: START, end: END },
      });

      expect(results).to.have.length(1);

      const { histogram, totalCount, samples } = results[0].data;

      expect(histogram).to.be.an('array');
      expect(histogram.length).to.be.greaterThan(0);
      expect(totalCount).to.be.greaterThan(0);
      expect(samples).to.be.an('array');
      expect(samples.length).to.be.greaterThan(0);

      for (const sample of samples) {
        expect(sample).to.have.property('@timestamp');
        expect(sample).to.have.property('_id');
        expect(sample).to.have.property('_index');
        expect(sample).to.have.property('message');
      }
    });

    it('filters by service.name using kqlFilter', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: {
          start: START,
          end: END,
          kqlFilter: 'service.name: "inventory-service"',
          fields: ['message', 'service.name'],
        },
      });

      const { samples, totalCount } = results[0].data;

      expect(totalCount).to.be.greaterThan(0);

      for (const sample of samples) {
        expect(sample['service.name']).to.be('inventory-service');
      }
    });

    it('adds group dimension to histogram when groupBy is used', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: {
          start: START,
          end: END,
          groupBy: 'log.level',
        },
      });

      const { histogram } = results[0].data;

      expect(histogram.length).to.be.greaterThan(0);

      for (const bucket of histogram) {
        expect(bucket).to.have.property('group');
      }
    });

    it('respects the limit parameter for samples', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: {
          start: START,
          end: END,
          limit: 3,
        },
      });

      expect(results[0].data.samples).to.have.length(3);
    });

    describe('iterative filtering funnel', () => {
      let broadCount: number;
      let afterHealthCheckCount: number;
      let afterLbCount: number;

      it('starts broad with high totalCount dominated by noise', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogsToolResult>({
          id: OBSERVABILITY_GET_LOGS_TOOL_ID,
          params: { start: START, end: END, limit: 20, fields: ['message', 'service.name'] },
        });

        broadCount = results[0].data.totalCount;

        expect(broadCount).to.be.greaterThan(100);
      });

      it('reduces totalCount after excluding health checks', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogsToolResult>({
          id: OBSERVABILITY_GET_LOGS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'NOT message: "GET /health 200 OK"',
            limit: 20,
            fields: ['message', 'service.name'],
          },
        });

        afterHealthCheckCount = results[0].data.totalCount;

        expect(afterHealthCheckCount).to.be.lessThan(broadCount);
      });

      it('reduces totalCount further after also excluding load-balancer', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogsToolResult>({
          id: OBSERVABILITY_GET_LOGS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'NOT message: "GET /health 200 OK" AND NOT service.name: "load-balancer"',
            limit: 20,
            fields: ['message', 'service.name'],
          },
        });

        afterLbCount = results[0].data.totalCount;

        expect(afterLbCount).to.be.lessThan(afterHealthCheckCount);

        const errorServices = new Set(
          results[0].data.samples.map((s) => s['service.name'] as string)
        );

        expect(errorServices.has('load-balancer')).to.be(false);
      });
    });
  });
}
