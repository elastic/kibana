/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { first } from 'lodash';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { expectSnapshot } from '../../../common/match_snapshot';

interface Chart {
  title: string;
  key: string;
  yUnit: string;
  noHits: boolean;
  series: Array<{
    title: string;
    key: string;
    type: string;
    color: string;
    overallValue: number;
    data: Array<{ x: number; y: number | null }>;
  }>;
}

interface ChartResponse {
  body: {
    charts: Chart[];
  };
  status: number;
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('when data is loaded', () => {
    before(() => esArchiver.load('metrics_8.0.0'));
    after(() => esArchiver.unload('metrics_8.0.0'));

    describe('for opbeans-node', () => {
      const start = encodeURIComponent('2020-09-08T14:50:00.000Z');
      const end = encodeURIComponent('2020-09-08T14:55:00.000Z');
      const uiFilters = encodeURIComponent(JSON.stringify({}));
      const agentName = 'nodejs';

      describe('returns metrics data', () => {
        let chartsResponse: ChartResponse;
        before(async () => {
          chartsResponse = await supertest.get(
            `/api/apm/services/opbeans-node/metrics/charts?start=${start}&end=${end}&uiFilters=${uiFilters}&agentName=${agentName}`
          );
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
          let cpuUsageChart: Chart | undefined;
          before(() => {
            cpuUsageChart = chartsResponse.body.charts.find(({ key }) => key === 'cpu_usage_chart');
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
                0.38770000000000004,
                0.75,
                0.2543,
              ]
            `);
          });
        });

        describe("System memory usage (using 'system.memory' fields to calculate the memory usage)", () => {
          let systemMemoryUsageChart: Chart | undefined;
          before(() => {
            systemMemoryUsageChart = chartsResponse.body.charts.find(
              ({ key }) => key === 'memory_usage_chart'
            );
          });

          it('has correct series', () => {
            expect(systemMemoryUsageChart).to.not.empty();
            expectSnapshot(systemMemoryUsageChart?.series.map(({ title }) => title)).toMatchInline(`
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
                0.7220939209255549,
                0.7181735467963479,
              ]
            `);
          });
        });
      });
    });

    describe('for opbeans-java', () => {
      const uiFilters = encodeURIComponent(JSON.stringify({}));
      const agentName = 'java';

      describe('returns metrics data', () => {
        const start = encodeURIComponent('2020-09-08T14:55:30.000Z');
        const end = encodeURIComponent('2020-09-08T15:00:00.000Z');

        let chartsResponse: ChartResponse;
        before(async () => {
          chartsResponse = await supertest.get(
            `/api/apm/services/opbeans-java/metrics/charts?start=${start}&end=${end}&uiFilters=${uiFilters}&agentName=${agentName}`
          );
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
          let cpuUsageChart: Chart | undefined;
          before(() => {
            cpuUsageChart = chartsResponse.body.charts.find(({ key }) => key === 'cpu_usage_chart');
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
                0.17877777777777779,
                0.01,
                0.009000000000000001,
              ]
            `);
          });

          it('has the correct rate', async () => {
            const yValues = cpuUsageChart?.series.map((serie) => first(serie.data)?.y);
            expectSnapshot(yValues).toMatchInline(`
              Array [
                0.193,
                0.193,
                0.009000000000000001,
                0.009000000000000001,
              ]
            `);
          });
        });

        describe("System memory usage (using 'system.process.cgroup' fields to calculate the memory usage)", () => {
          let systemMemoryUsageChart: Chart | undefined;
          before(() => {
            systemMemoryUsageChart = chartsResponse.body.charts.find(
              ({ key }) => key === 'memory_usage_chart'
            );
          });

          it('has correct series', () => {
            expect(systemMemoryUsageChart).to.not.empty();
            expectSnapshot(systemMemoryUsageChart?.series.map(({ title }) => title)).toMatchInline(`
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
                0.7079247035578369,
                0.7053959808411816,
              ]
            `);
          });

          it('has the correct rate', async () => {
            const yValues = systemMemoryUsageChart?.series.map((serie) => first(serie.data)?.y);
            expectSnapshot(yValues).toMatchInline(`
              Array [
                0.7079247035578369,
                0.7079247035578369,
              ]
            `);
          });
        });

        describe('Heap Memory', () => {
          let cpuUsageChart: Chart | undefined;
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
                222501617.7777778,
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
          let cpuUsageChart: Chart | undefined;
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
                138573397.33333334,
                147677639.1111111,
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
          let cpuUsageChart: Chart | undefined;
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
                44.44444444444444,
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
          let cpuUsageChart: Chart | undefined;
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
                15,
              ]
            `);
          });
        });

        describe('Garbage collection time spent per minute', () => {
          let cpuUsageChart: Chart | undefined;
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
                187.5,
              ]
            `);
          });
        });
      });

      // 9223372036854771712 = memory limit for a c-group when no memory limit is specified
      it('calculates system memory usage using system total field when cgroup limit is equal to 9223372036854771712', async () => {
        const start = encodeURIComponent('2020-09-08T15:00:30.000Z');
        const end = encodeURIComponent('2020-09-08T15:05:00.000Z');

        const chartsResponse: ChartResponse = await supertest.get(
          `/api/apm/services/opbeans-java/metrics/charts?start=${start}&end=${end}&uiFilters=${uiFilters}&agentName=${agentName}`
        );

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
            0.11452389642649889,
            0.11400237609041514,
          ]
        `);

        const yValues = systemMemoryUsageChart?.series.map((serie) => first(serie.data)?.y);
        expectSnapshot(yValues).toMatchInline(`
          Array [
            0.11383724014063981,
            0.11383724014063981,
          ]
        `);
      });
    });
  });
}
