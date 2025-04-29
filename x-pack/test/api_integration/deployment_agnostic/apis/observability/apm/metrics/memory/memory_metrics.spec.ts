/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { config, generateData } from './generate_data';
import { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function callMetricChartsAPI(serviceName: string) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/metrics/charts`,
      params: {
        path: { serviceName },
        query: {
          environment: 'production',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          kuery: '',
          agentName: 'go',
        },
      },
    });
  }

  describe('Memory', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await generateData({ start, end, apmSynthtraceEsClient });
    });

    after(() => apmSynthtraceEsClient.clean());

    it('returns system memory stats', async () => {
      const expectedFreeMemory = 1 - config.memoryFree / config.memoryTotal;

      const { status, body } = await callMetricChartsAPI('system-metric-only-service');
      const memoryChart = body.charts.find(({ key }) => key === 'memory_usage_chart');

      expect(status).to.be(200);
      [
        { title: 'Max', expectedValue: expectedFreeMemory },
        { title: 'Average', expectedValue: expectedFreeMemory },
      ].map(({ title, expectedValue }) => {
        const series = memoryChart?.series.find((item) => item.title === title);
        expect(series?.overallValue).to.eql(expectedValue);
      });
    });

    it('returns cgroup memory with system.process.cgroup.memory.mem.limit.bytes', async () => {
      const expectedFreeMemory = config.cGroupMemoryUsage / config.cGroupMemoryLimit;

      const { status, body } = await callMetricChartsAPI('cgroup-memory-with-limit-production');
      const memoryChart = body.charts.find(({ key }) => key === 'memory_usage_chart');

      expect(status).to.be(200);
      [
        { title: 'Max', expectedValue: expectedFreeMemory },
        { title: 'Average', expectedValue: expectedFreeMemory },
      ].map(({ title, expectedValue }) => {
        const series = memoryChart?.series.find((item) => item.title === title);
        expect(series?.overallValue).to.eql(expectedValue);
      });
    });

    it('handles cgroup memory stats when system.process.cgroup.memory.mem.limit.bytes and system.memory.total are not present', async () => {
      const { status, body } = await callMetricChartsAPI('cgroup-memory-only-production');
      expect(status).to.be(200);

      const memoryChart = body.charts.find(({ key }) => key === 'memory_usage_chart');
      expect(memoryChart?.series).to.eql([]);
    });
  });
}
