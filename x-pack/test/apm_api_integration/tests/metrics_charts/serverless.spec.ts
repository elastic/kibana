/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { apm, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(serviceName: string, agentName: string) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/metrics/charts`,
      params: {
        path: { serviceName },
        query: {
          environment: 'test',
          agentName,
          kuery: '',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          serviceRuntimeName: 'aws_lambda',
        },
      },
    });
  }

  registry.when(
    'Serverless metrics charts when data is loaded',
    { config: 'basic', archives: [] },
    () => {
      const MEMORY_TOTAL = 536870912; // 0.5gb;
      const MEMORY_FREE = 94371840; // ~0.08 gb;
      const BILLED_DURATION_MS = 4000;
      const FAAS_TIMEOUT_MS = 10000;
      const COLD_START_PYTHON = true;
      const COLD_START_DURATION_PYTHON = 4000;
      const COLD_START_NODE = false;
      const COLD_START_DURATION_NODE = 0;
      const FAAS_DURATION = 4000;
      const TRANSACTION_DURATION = 1000;

      before(async () => {
        const instancePython = apm
          .service('lambda-python', 'test', 'python')
          .instance('instance-python');
        const instanceNode = apm.service('lambda-node', 'test', 'nodejs').instance('instance-node');

        const systemMetrics = {
          'system.memory.actual.free': MEMORY_FREE,
          'system.memory.total': MEMORY_TOTAL,
          'system.cpu.total.norm.pct': 0.6,
          'system.process.cpu.total.norm.pct': 0.7,
        };

        const transactionsEvents = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => [
            instancePython
              .transaction('GET /order/{id}')
              .defaults({
                'service.runtime.name': 'AWS_Lambda_python3.8',
                'cloud.provider': 'aws',
                'cloud.service.name': 'lambda',
                'cloud.region': 'us-east-1',
              })
              .timestamp(timestamp)
              .duration(TRANSACTION_DURATION)
              .success(),
            instanceNode
              .transaction('GET /orders')
              .defaults({
                'service.runtime.name': 'AWS_Lambda_nodejs',
                'cloud.provider': 'aws',
                'cloud.service.name': 'lambda',
                'cloud.region': 'us-east-1',
              })
              .timestamp(timestamp)
              .duration(TRANSACTION_DURATION)
              .success(),
          ]);

        const metricsEvents = timerange(start, end)
          .interval('30s')
          .rate(1)
          .generator((timestamp) => [
            instancePython
              .appMetrics({
                ...systemMetrics,
                'faas.id': `arn:aws:lambda:us-west-2:123456789012:function:lambda-python-1`,
                'faas.coldstart': COLD_START_PYTHON,
                'faas.trigger.type': 'other',
                'faas.billed_duration': BILLED_DURATION_MS,
                'faas.timeout': FAAS_TIMEOUT_MS,
                'faas.coldstart_duration': COLD_START_DURATION_PYTHON,
                'faas.duration': FAAS_DURATION,
              })
              .timestamp(timestamp),
            instanceNode
              .appMetrics({
                ...systemMetrics,
                'faas.id': `arn:aws:lambda:us-west-2:123456789012:function:lambda-nodejs-1`,
                'faas.coldstart': COLD_START_NODE,
                'faas.trigger.type': 'other',
                'faas.billed_duration': BILLED_DURATION_MS,
                'faas.timeout': FAAS_TIMEOUT_MS,
                'faas.coldstart_duration': COLD_START_DURATION_NODE,
                'faas.duration': FAAS_DURATION,
              })
              .timestamp(timestamp),
          ]);

        await synthtraceEsClient.index(transactionsEvents.merge(metricsEvents));
      });

      after(() => synthtraceEsClient.clean());

      describe('python', () => {
        let metrics: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/charts'>;
        before(async () => {
          const { status, body } = await callApi('lambda-python', 'pytong');

          expect(status).to.be(200);
          metrics = body;
        });

        it('returns all metrics chart', () => {
          expect(metrics.charts.length).to.be.greaterThan(0);
          expect(metrics.charts.map(({ title }) => title).sort()).to.eql([
            'Active instances',
            'Avg. Duration',
            'Cold start',
            'Cold start duration',
            'Compute usage',
            'System memory usage',
          ]);
        });

        it('returns correct overallValue on avg duration chart', () => {
          const metric = metrics.charts.find((chart) => chart.key === 'avg_duration');
          expect(metric).not.to.be.empty();
          const billedDurationSeries = metric?.series.find(
            ({ title }) => title === 'Billed Duration'
          );
          expect(billedDurationSeries).not.to.be.empty();
          expect(billedDurationSeries?.overallValue).to.equal(BILLED_DURATION_MS);

          const transactionDurationSeries = metric?.series.find(
            ({ title }) => title === 'Transaction Duration'
          );
          expect(transactionDurationSeries).not.to.be.empty();
          expect(transactionDurationSeries?.overallValue).to.equal(TRANSACTION_DURATION * 1000);
        });

        it('returns correct overallValue on Cold start chart', () => {
          const metric = metrics.charts.find((chart) => chart.key === 'cold_start_duration');
          expect(metric).not.to.be.empty();
          expect(metric?.series[0].overallValue).to.equal(COLD_START_DURATION_PYTHON);
        });

        it('returns correct overallValue on System memory usage chart', () => {
          const metric = metrics.charts.find((chart) => chart.key === 'memory_usage_chart');
          expect(metric).not.to.be.empty();

          const memoryValue = roundNumber(1 - MEMORY_FREE / MEMORY_TOTAL);

          const maxMemorySeries = metric?.series.find(({ title }) => title === 'Max');

          expect(maxMemorySeries).not.to.be.empty();
          expect(roundNumber(maxMemorySeries?.overallValue)).to.equal(memoryValue);

          const avgMemorySeries = metric?.series.find(({ title }) => title === 'Average');
          expect(avgMemorySeries).not.to.be.empty();
          expect(roundNumber(avgMemorySeries?.overallValue)).to.equal(memoryValue);
        });

        it('returns correct overallValue on Compute usage chart', () => {
          const metric = metrics.charts.find((chart) => chart.key === 'compute_usage');
          expect(metric).not.to.be.empty();
          const bytesMs = MEMORY_TOTAL * BILLED_DURATION_MS;
          const gbSecs = bytesMs / (1024 * 1024 * 1024 * 1000);
          expect(metric?.series[0].overallValue).to.equal(gbSecs);
        });

        it('returns correct overallValue on Active instances chart', () => {
          const metric = metrics.charts.find((chart) => chart.key === 'active_instances');
          expect(metric).not.to.be.empty();
          expect(metric?.series[0].overallValue).to.equal(1);
        });

        it('returns correct overallValue on cold start count chart', () => {
          const metric = metrics.charts.find((chart) => chart.key === 'cold_start_count');
          expect(metric).not.to.be.empty();
          expect(metric?.series[0].overallValue).to.equal(30);
        });
      });

      describe('nodejs', () => {
        let metrics: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/charts'>;
        before(async () => {
          const { status, body } = await callApi('lambda-node', 'nodejs');
          expect(status).to.be(200);
          metrics = body;
        });

        it('returns all metrics chart', () => {
          expect(metrics.charts.length).to.be.greaterThan(0);
          expect(metrics.charts.map(({ title }) => title).sort()).to.eql([
            'Active instances',
            'Avg. Duration',
            'Cold start',
            'Cold start duration',
            'Compute usage',
            'System memory usage',
          ]);
        });

        it('returns correct overallValue on Cold start chart', () => {
          const metric = metrics.charts.find((chart) => chart.key === 'cold_start_duration');
          expect(metric).not.to.be.empty();
          expect(metric?.series[0].overallValue).to.equal(COLD_START_DURATION_NODE);
        });

        it('returns correct overallValue on cold start count chart', () => {
          const metric = metrics.charts.find((chart) => chart.key === 'cold_start_count');
          expect(metric).not.to.be.empty();
          expect(metric?.series).to.be.empty();
        });
      });
    }
  );
}
