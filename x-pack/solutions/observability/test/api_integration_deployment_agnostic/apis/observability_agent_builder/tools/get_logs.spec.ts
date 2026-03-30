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
import type { GetLogsToolSuccessResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_logs/tool';
import { uniq } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const START = 'now-15m';
const END = 'now';

function getTopValueValues(
  topValues: Record<string, Array<{ value: string; count: number }>>
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(topValues).map(([field, entries]) => [field, entries.map((e) => e.value).sort()])
  );
}

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

    it('returns all response sections', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: { start: START, end: END },
      });

      expect(results).to.have.length(1);

      const { histogram, totalCount, samples, categories, topValues } = results[0].data;

      expect(histogram.length).to.be.greaterThan(0);
      expect(totalCount).to.be.greaterThan(1000);
      expect(samples.length).to.be.greaterThan(0);
      expect(categories.length).to.be.greaterThan(0);
      expect(Object.keys(topValues).length).to.be.greaterThan(0);
    });

    it('returns expected sample fields', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: { start: START, end: END },
      });

      const sampleFieldKeys = Object.keys(results[0].data.samples[0]).sort();
      expect(sampleFieldKeys).to.eql([
        '@timestamp',
        '_id',
        '_index',
        'host.name',
        'kubernetes.namespace',
        'kubernetes.pod.name',
        'log.level',
        'message',
        'service.name',
      ]);
    });

    it('returns expected category patterns with type', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: { start: START, end: END },
      });

      const { categories } = results[0].data;

      const categoryPatterns = categories.map((c) => c.pattern).sort();
      expect(categoryPatterns).to.eql([
        'CRON Running scheduled cleanup task',
        'Connection pool exhausted cannot acquire connection within Active Idle',
        'Connection pool utilization at connections in use',
        'Email delivery delayed retrying in SMTP server slow',
        'Email sent to customer successfully',
        'Failed to validate stock for order inventory-service unavailable',
        'GET /health OK',
        'GET HTTP/1.1 via_upstream',
        'Gateway POST /api/checkout upstream checkout-service',
        'POST /api/checkout HTTP/1.1 via_upstream',
        'Payment processed successfully',
        'Processing order for customer',
        'Query timeout after SELECT FROM products WHERE category_id full table scan detected missing index on category_id',
        'Stock check for product completed',
        'Timeout calling inventory-service after POST /api/inventory/validate-stock',
        'filter kubernetes kubernetes.0 Merged new pod metadata',
      ]);

      for (const category of categories) {
        expect(category.type).to.be('log');
      }
    });

    it('returns expected topValues', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: { start: START, end: END },
      });

      const values = getTopValueValues(results[0].data.topValues);

      expect(Object.keys(values).sort()).to.eql([
        'host.name',
        'kubernetes.namespace',
        'kubernetes.pod.name',
        'log.level',
        'service.environment',
        'service.name',
      ]);

      expect(values['log.level']).to.eql(['error', 'info', 'warn']);
      expect(values['service.environment']).to.eql(['production']);
      expect(values['host.name']).to.eql(['synth-host']);
      expect(values['kubernetes.namespace']).to.eql(['default', 'ingress', 'kube-system']);

      expect(values['service.name']).to.eql([
        'api-gateway',
        'checkout-service',
        'fluent-bit',
        'inventory-service',
        'load-balancer',
        'notification-service',
        'payment-service',
        'task-scheduler',
      ]);
    });

    it('filters results with kqlFilter', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: {
          start: START,
          end: END,
          kqlFilter: 'service.name: "inventory-service"',
          fields: ['message', 'service.name'],
        },
      });

      const { samples, categories } = results[0].data;

      for (const sample of samples) {
        expect(sample['service.name']).to.be('inventory-service');
      }

      const categoryPatterns = categories.map((c) => c.pattern).sort();
      expect(categoryPatterns).to.eql([
        'Connection pool exhausted cannot acquire connection within Active Idle',
        'Connection pool utilization at connections in use',
        'GET /health OK',
        'Query timeout after SELECT FROM products WHERE category_id full table scan detected missing index on category_id',
        'Stock check for product completed',
      ]);
    });

    it('groups histogram by field with groupBy', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: {
          start: START,
          end: END,
          groupBy: 'log.level',
        },
      });

      const groups = uniq(results[0].data.histogram.map((b) => b.group)).sort();
      expect(groups).to.eql(['error', 'info', 'warn']);

      const topValues = results[0].data.topValues['log.level'].map((b) => b.value).sort();
      expect(topValues).to.eql(['error', 'info', 'warn']);
    });

    it('limits sample count with limit parameter', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: { start: START, end: END, limit: 3 },
      });

      expect(results[0].data.samples).to.have.length(3);
    });

    it('controls sample fields with fields parameter', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: {
          start: START,
          end: END,
          fields: ['message', 'service.name'],
        },
      });

      const sampleKeys = Object.keys(results[0].data.samples[0]).sort();
      expect(sampleKeys).to.eql(['@timestamp', '_id', '_index', 'message', 'service.name']);
    });

    it('reduces results when iteratively excluding noise', async () => {
      const broadResults = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: { start: START, end: END },
      });
      const broadCount = broadResults[0].data.totalCount;
      expect(broadCount).to.be.greaterThan(1000);

      const filteredResults = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: {
          start: START,
          end: END,
          kqlFilter: 'NOT message: "GET /health 200 OK"',
        },
      });
      const filteredCount = filteredResults[0].data.totalCount;
      expect(filteredCount).to.be.lessThan(broadCount);

      const narrowResults = await agentBuilderApiClient.executeTool<GetLogsToolSuccessResult>({
        id: OBSERVABILITY_GET_LOGS_TOOL_ID,
        params: {
          start: START,
          end: END,
          kqlFilter: 'NOT message: "GET /health 200 OK" AND NOT service.name: "load-balancer"',
        },
      });
      const narrowCount = narrowResults[0].data.totalCount;
      expect(narrowCount).to.be.lessThan(filteredCount);

      const narrowServiceNames = getTopValueValues(narrowResults[0].data.topValues)['service.name'];
      expect(narrowServiceNames).to.not.contain('load-balancer');
    });
  });
}
