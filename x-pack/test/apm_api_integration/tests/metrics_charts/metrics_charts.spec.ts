/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first } from 'lodash';
import { GenericMetricsChart } from '@kbn/apm-plugin/server/routes/metrics/fetch_and_transform_metrics';
import { SupertestReturnType } from '../../common/apm_api_supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type ChartResponse = SupertestReturnType<'GET /internal/apm/services/{serviceName}/metrics/charts'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  registry.when(
    'Metrics charts when data is loaded',
    { config: 'basic', archives: ['metrics_8.0.0'] },
    () => {
      describe('for opbeans-node', () => {
        describe('returns metrics data', () => {
          let chartsResponse: ChartResponse;
          before(async () => {
            chartsResponse = await apmApiClient.readUser({
              endpoint: 'GET /internal/apm/services/{serviceName}/metrics/charts',
              params: {
                path: { serviceName: 'opbeans-node' },
                query: {
                  start: '2020-09-08T14:50:00.000Z',
                  end: '2020-09-08T14:55:00.000Z',
                  agentName: 'nodejs',
                  environment: 'ENVIRONMENT_ALL',
                  kuery: ``,
                },
              },
            });
          });

          it('contains CPU usage and System memory usage chart data', async () => {
            expect(chartsResponse.status).to.be(200);
            expectSnapshot(chartsResponse.body.charts.map((chart) => chart.title)).toMatchInline(`
                          Array [
                            "CPU usage",
                            "System memory usage",
                          ]
                      `);
          });

          describe('CPU usage', () => {
            let cpuUsageChart: GenericMetricsChart | undefined;
            before(() => {
              cpuUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'cpu_usage_chart'
              );
            });

            it('has correct series', () => {
              expect(cpuUsageChart).to.not.empty();
              expectSnapshot(cpuUsageChart?.series.map(({ title }) => title)).toMatchInline(`
                              Array [
                                "System max",
                                "System average",
                                "Process max",
                                "Process average",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(cpuUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                Array [
                  0.714,
                  0.3877,
                  0.75,
                  0.2543,
                ]
              `);
            });
          });

          describe("System memory usage (using 'system.memory' fields to calculate the memory usage)", () => {
            let systemMemoryUsageChart: GenericMetricsChart | undefined;
            before(() => {
              systemMemoryUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'memory_usage_chart'
              );
            });

            it('has correct series', () => {
              expect(systemMemoryUsageChart).to.not.empty();
              expectSnapshot(systemMemoryUsageChart?.series.map(({ title }) => title))
                .toMatchInline(`
                              Array [
                                "Max",
                                "Average",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(systemMemoryUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                Array [
                  0.722093920925555,
                  0.718173546796348,
                ]
              `);
            });
          });
        });
      });

      describe('for opbeans-java', () => {
        describe('returns metrics data', () => {
          let chartsResponse: ChartResponse;
          before(async () => {
            chartsResponse = await apmApiClient.readUser({
              endpoint: 'GET /internal/apm/services/{serviceName}/metrics/charts',
              params: {
                path: { serviceName: 'opbeans-java' },
                query: {
                  start: '2020-09-08T14:55:30.000Z',
                  end: '2020-09-08T15:00:00.000Z',
                  agentName: 'java',
                  environment: 'ENVIRONMENT_ALL',
                  kuery: ``,
                },
              },
            });
          });

          it('has correct chart data', async () => {
            expect(chartsResponse.status).to.be(200);
            expectSnapshot(chartsResponse.body.charts.map((chart) => chart.title)).toMatchInline(`
                          Array [
                            "CPU usage",
                            "System memory usage",
                            "Heap Memory",
                            "Non-Heap Memory",
                            "Thread Count",
                            "Garbage collection per minute",
                            "Garbage collection time spent per minute",
                          ]
                      `);
          });

          describe('CPU usage', () => {
            let cpuUsageChart: GenericMetricsChart | undefined;
            before(() => {
              cpuUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'cpu_usage_chart'
              );
            });

            it('has correct series', () => {
              expect(cpuUsageChart).to.not.empty();
              expectSnapshot(cpuUsageChart?.series.map(({ title }) => title)).toMatchInline(`
                              Array [
                                "System max",
                                "System average",
                                "Process max",
                                "Process average",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(cpuUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                              Array [
                                0.203,
                                0.178777777777778,
                                0.01,
                                0.009,
                              ]
                          `);
            });

            it('has the correct rate', async () => {
              const yValues = cpuUsageChart?.series.map((serie) => first(serie.data)?.y);
              expectSnapshot(yValues).toMatchInline(`
                              Array [
                                0.193,
                                0.193,
                                0.009,
                                0.009,
                              ]
                          `);
            });
          });

          describe("System memory usage (using 'system.process.cgroup' fields to calculate the memory usage)", () => {
            let systemMemoryUsageChart: GenericMetricsChart | undefined;
            before(() => {
              systemMemoryUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'memory_usage_chart'
              );
            });

            it('has correct series', () => {
              expect(systemMemoryUsageChart).to.not.empty();
              expectSnapshot(systemMemoryUsageChart?.series.map(({ title }) => title))
                .toMatchInline(`
                              Array [
                                "Max",
                                "Average",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(systemMemoryUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                              Array [
                                0.707924703557837,
                                0.705395980841182,
                              ]
                          `);
            });

            it('has the correct rate', async () => {
              const yValues = systemMemoryUsageChart?.series.map((serie) => first(serie.data)?.y);
              expectSnapshot(yValues).toMatchInline(`
                              Array [
                                0.707924703557837,
                                0.707924703557837,
                              ]
                          `);
            });
          });

          describe('Heap Memory', () => {
            let cpuUsageChart: GenericMetricsChart | undefined;
            before(() => {
              cpuUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'heap_memory_area_chart'
              );
            });

            it('has correct series', () => {
              expect(cpuUsageChart).to.not.empty();
              expectSnapshot(cpuUsageChart?.series.map(({ title }) => title)).toMatchInline(`
                              Array [
                                "Avg. used",
                                "Avg. committed",
                                "Avg. limit",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(cpuUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                              Array [
                                222501617.777778,
                                374341632,
                                1560281088,
                              ]
                          `);
            });

            it('has the correct rate', async () => {
              const yValues = cpuUsageChart?.series.map((serie) => first(serie.data)?.y);
              expectSnapshot(yValues).toMatchInline(`
                              Array [
                                211472896,
                                374341632,
                                1560281088,
                              ]
                          `);
            });
          });

          describe('Non-Heap Memory', () => {
            let cpuUsageChart: GenericMetricsChart | undefined;
            before(() => {
              cpuUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'non_heap_memory_area_chart'
              );
            });

            it('has correct series', () => {
              expect(cpuUsageChart).to.not.empty();
              expectSnapshot(cpuUsageChart?.series.map(({ title }) => title)).toMatchInline(`
                              Array [
                                "Avg. used",
                                "Avg. committed",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(cpuUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                              Array [
                                138573397.333333,
                                147677639.111111,
                              ]
                          `);
            });

            it('has the correct rate', async () => {
              const yValues = cpuUsageChart?.series.map((serie) => first(serie.data)?.y);
              expectSnapshot(yValues).toMatchInline(`
                              Array [
                                138162752,
                                147386368,
                              ]
                          `);
            });
          });

          describe('Thread Count', () => {
            let cpuUsageChart: GenericMetricsChart | undefined;
            before(() => {
              cpuUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'thread_count_line_chart'
              );
            });

            it('has correct series', () => {
              expect(cpuUsageChart).to.not.empty();
              expectSnapshot(cpuUsageChart?.series.map(({ title }) => title)).toMatchInline(`
                              Array [
                                "Avg. count",
                                "Max count",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(cpuUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                              Array [
                                44.4444444444444,
                                45,
                              ]
                          `);
            });

            it('has the correct rate', async () => {
              const yValues = cpuUsageChart?.series.map((serie) => first(serie.data)?.y);
              expectSnapshot(yValues).toMatchInline(`
                              Array [
                                44,
                                44,
                              ]
                          `);
            });
          });

          describe('Garbage collection per minute', () => {
            let cpuUsageChart: GenericMetricsChart | undefined;
            before(() => {
              cpuUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'gc_rate_line_chart'
              );
            });

            it('has correct series', () => {
              expect(cpuUsageChart).to.not.empty();
              expectSnapshot(cpuUsageChart?.series.map(({ title }) => title)).toMatchInline(`
                              Array [
                                "G1 Old Generation",
                                "G1 Young Generation",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(cpuUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                Array [
                  0,
                  3,
                ]
              `);
            });
          });

          describe('Garbage collection time spent per minute', () => {
            let cpuUsageChart: GenericMetricsChart | undefined;
            before(() => {
              cpuUsageChart = chartsResponse.body.charts.find(
                ({ key }) => key === 'gc_time_line_chart'
              );
            });

            it('has correct series', () => {
              expect(cpuUsageChart).to.not.empty();
              expectSnapshot(cpuUsageChart?.series.map(({ title }) => title)).toMatchInline(`
                              Array [
                                "G1 Old Generation",
                                "G1 Young Generation",
                              ]
                          `);
            });

            it('has correct series overall values', () => {
              expectSnapshot(cpuUsageChart?.series.map(({ overallValue }) => overallValue))
                .toMatchInline(`
                Array [
                  0,
                  37500,
                ]
              `);
            });
          });
        });

        // 9223372036854771712 = memory limit for a c-group when no memory limit is specified
        it('calculates system memory usage using system total field when cgroup limit is equal to 9223372036854771712', async () => {
          const chartsResponse = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services/{serviceName}/metrics/charts',
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                start: '2020-09-08T15:00:30.000Z',
                end: '2020-09-08T15:05:00.000Z',
                agentName: 'java',
                environment: 'ENVIRONMENT_ALL',
                kuery: ``,
              },
            },
          });

          const systemMemoryUsageChart = chartsResponse.body.charts.find(
            ({ key }) => key === 'memory_usage_chart'
          );

          expect(systemMemoryUsageChart).to.not.empty();
          expectSnapshot(systemMemoryUsageChart?.series.map(({ title }) => title)).toMatchInline(`
                      Array [
                        "Max",
                        "Average",
                      ]
                  `);
          expectSnapshot(systemMemoryUsageChart?.series.map(({ overallValue }) => overallValue))
            .toMatchInline(`
                      Array [
                        0.114523896426499,
                        0.114002376090415,
                      ]
                  `);

          const yValues = systemMemoryUsageChart?.series.map((serie) => first(serie.data)?.y);
          expectSnapshot(yValues).toMatchInline(`
                      Array [
                        0.11383724014064,
                        0.11383724014064,
                      ]
                  `);
        });
      });
    }
  );
}
