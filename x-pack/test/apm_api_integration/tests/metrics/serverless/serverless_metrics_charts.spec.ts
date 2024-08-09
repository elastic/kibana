/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { Coordinate } from '@kbn/apm-plugin/typings/timeseries';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { generateData, config } from './generate_data';

function isNotNullOrZeroCoordinate(coordinate: Coordinate) {
  return coordinate.y !== null && coordinate.y !== 0;
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const numberOfTransactionsCreated = 15;

  async function callApi(serviceName: string, serverlessId?: string) {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/charts',
      params: {
        path: { serviceName },
        query: {
          environment: 'test',
          kuery: '',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          bucketSizeInSeconds: 60,
          ...(serverlessId ? { serverlessId } : {}),
        },
      },
    });
  }

  registry.when(
    'Serverless metrics charts when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      let serverlessMetrics: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless/charts'>;
      before(async () => {
        const response = await callApi('lambda-python');
        serverlessMetrics = response.body;
      });

      it('returns empty', () => {
        serverlessMetrics.charts.forEach((chart) => {
          expect(chart.series).to.be.empty();
        });
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177642
  registry.when('Serverless metrics charts', { config: 'basic', archives: [] }, () => {
    const {
      memoryTotal,
      memoryFree,
      billedDurationMs,
      coldStartDurationPython,
      transactionDuration,
      pythonServerlessFunctionNames,
      serverlessId,
    } = config;

    before(async () => {
      await generateData({ start, end, apmSynthtraceEsClient });
    });

    after(() => apmSynthtraceEsClient.clean());

    describe('Python service', () => {
      let serverlessMetrics: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless/charts'>;
      before(async () => {
        const response = await callApi('lambda-python');
        serverlessMetrics = response.body;
      });

      it('returns all metrics chart', () => {
        expect(serverlessMetrics.charts.length).to.be.greaterThan(0);
        expect(serverlessMetrics.charts.map(({ title }) => title).sort()).to.eql([
          'Cold start duration',
          'Cold starts',
          'Compute usage',
          'Lambda Duration',
          'System memory usage',
        ]);
      });

      describe('Avg. Duration', () => {
        const transactionDurationInMicroSeconds = transactionDuration * 1000;
        [
          { title: 'Billed Duration', expectedValue: billedDurationMs * 1000 },
          { title: 'Transaction Duration', expectedValue: transactionDurationInMicroSeconds },
        ].map(({ title, expectedValue }) =>
          it(`returns correct ${title} value`, () => {
            const avgDurationMetric = serverlessMetrics.charts.find((chart) => {
              return chart.key === 'avg_duration';
            });
            const series = avgDurationMetric?.series.find((item) => item.title === title);
            expect(series?.overallValue).to.eql(expectedValue);
            const meanValue = meanBy(series?.data.filter(isNotNullOrZeroCoordinate), 'y');
            expect(meanValue).to.eql(expectedValue);
          })
        );
      });

      let metricsChart: (typeof serverlessMetrics.charts)[0] | undefined;

      describe('Cold start duration', () => {
        before(() => {
          metricsChart = serverlessMetrics.charts.find((chart) => {
            return chart.key === 'cold_start_duration';
          });
        });
        it('returns correct overall value', () => {
          expect(metricsChart?.series[0].overallValue).to.equal(coldStartDurationPython * 1000);
        });

        it('returns correct mean value', () => {
          const meanValue = meanBy(
            metricsChart?.series[0]?.data.filter(isNotNullOrZeroCoordinate),
            'y'
          );
          expect(meanValue).to.equal(coldStartDurationPython * 1000);
        });
      });

      describe('Cold start count', () => {
        before(() => {
          metricsChart = serverlessMetrics.charts.find((chart) => {
            return chart.key === 'cold_start_count';
          });
        });

        it('returns correct overall value', () => {
          expect(metricsChart?.series[0].overallValue).to.equal(
            numberOfTransactionsCreated * pythonServerlessFunctionNames.length
          );
        });

        it('returns correct sum value', () => {
          const sumValue = sumBy(
            metricsChart?.series[0]?.data.filter(isNotNullOrZeroCoordinate),
            'y'
          );
          expect(sumValue).to.equal(
            numberOfTransactionsCreated * pythonServerlessFunctionNames.length
          );
        });
      });

      describe('memory usage', () => {
        const expectedFreeMemory = 1 - memoryFree / memoryTotal;
        [
          { title: 'Max', expectedValue: expectedFreeMemory },
          { title: 'Average', expectedValue: expectedFreeMemory },
        ].map(({ title, expectedValue }) =>
          it(`returns correct ${title} value`, () => {
            const memoryUsageMetric = serverlessMetrics.charts.find((chart) => {
              return chart.key === 'memory_usage_chart';
            });
            const series = memoryUsageMetric?.series.find((item) => item.title === title);
            expect(series?.overallValue).to.eql(expectedValue);
            const meanValue = meanBy(series?.data.filter(isNotNullOrZeroCoordinate), 'y');
            expect(meanValue).to.eql(expectedValue);
          })
        );
      });

      describe('Compute usage', () => {
        const GBSeconds = 1024 * 1024 * 1024 * 1000;
        let computeUsageMetric: (typeof serverlessMetrics.charts)[0] | undefined;
        before(() => {
          computeUsageMetric = serverlessMetrics.charts.find((chart) => {
            return chart.key === 'compute_usage';
          });
        });
        it('returns correct overall value', () => {
          const expectedValue =
            ((memoryTotal * billedDurationMs) / GBSeconds) * numberOfTransactionsCreated * 2;
          expect(computeUsageMetric?.series[0].overallValue).to.equal(expectedValue);
        });

        it('returns correct mean value', () => {
          const expectedValue = ((memoryTotal * billedDurationMs) / GBSeconds) * 2;
          const meanValue = meanBy(
            computeUsageMetric?.series[0]?.data.filter((item) => item.y !== 0),
            'y'
          );
          expect(meanValue).to.equal(expectedValue);
        });
      });
    });

    describe('detailed metrics', () => {
      let serverlessMetrics: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless/charts'>;
      before(async () => {
        const response = await callApi(
          'lambda-python',
          `${serverlessId}${pythonServerlessFunctionNames[0]}`
        );
        serverlessMetrics = response.body;
      });

      it('returns all metrics chart', () => {
        expect(serverlessMetrics.charts.length).to.be.greaterThan(0);
        expect(serverlessMetrics.charts.map(({ title }) => title).sort()).to.eql([
          'Cold start duration',
          'Cold starts',
          'Compute usage',
          'Lambda Duration',
          'System memory usage',
        ]);
      });

      describe('Avg. Duration', () => {
        const transactionDurationInMicroSeconds = transactionDuration * 1000;
        [
          { title: 'Billed Duration', expectedValue: billedDurationMs * 1000 },
          { title: 'Transaction Duration', expectedValue: transactionDurationInMicroSeconds },
        ].map(({ title, expectedValue }) =>
          it(`returns correct ${title} value`, () => {
            const avgDurationMetric = serverlessMetrics.charts.find((chart) => {
              return chart.key === 'avg_duration';
            });
            const series = avgDurationMetric?.series.find((item) => item.title === title);
            expect(series?.overallValue).to.eql(expectedValue);
            const meanValue = meanBy(series?.data.filter(isNotNullOrZeroCoordinate), 'y');
            expect(meanValue).to.eql(expectedValue);
          })
        );
      });

      let metricsChart: (typeof serverlessMetrics.charts)[0] | undefined;

      describe('Cold start duration', () => {
        before(() => {
          metricsChart = serverlessMetrics.charts.find((chart) => {
            return chart.key === 'cold_start_duration';
          });
        });
        it('returns correct overall value', () => {
          expect(metricsChart?.series[0].overallValue).to.equal(coldStartDurationPython * 1000);
        });

        it('returns correct mean value', () => {
          const meanValue = meanBy(
            metricsChart?.series[0]?.data.filter(isNotNullOrZeroCoordinate),
            'y'
          );
          expect(meanValue).to.equal(coldStartDurationPython * 1000);
        });
      });

      describe('Cold start count', () => {
        before(() => {
          metricsChart = serverlessMetrics.charts.find((chart) => {
            return chart.key === 'cold_start_count';
          });
        });

        it('returns correct overall value', () => {
          expect(metricsChart?.series[0].overallValue).to.equal(numberOfTransactionsCreated);
        });

        it('returns correct sum value', () => {
          const sumValue = sumBy(
            metricsChart?.series[0]?.data.filter(isNotNullOrZeroCoordinate),
            'y'
          );
          expect(sumValue).to.equal(numberOfTransactionsCreated);
        });
      });

      describe('memory usage', () => {
        const expectedFreeMemory = 1 - memoryFree / memoryTotal;
        [
          { title: 'Max', expectedValue: expectedFreeMemory },
          { title: 'Average', expectedValue: expectedFreeMemory },
        ].map(({ title, expectedValue }) =>
          it(`returns correct ${title} value`, () => {
            const memoryUsageMetric = serverlessMetrics.charts.find((chart) => {
              return chart.key === 'memory_usage_chart';
            });
            const series = memoryUsageMetric?.series.find((item) => item.title === title);
            expect(series?.overallValue).to.eql(expectedValue);
            const meanValue = meanBy(series?.data.filter(isNotNullOrZeroCoordinate), 'y');
            expect(meanValue).to.eql(expectedValue);
          })
        );
      });

      describe('Compute usage', () => {
        const GBSeconds = 1024 * 1024 * 1024 * 1000;
        let computeUsageMetric: (typeof serverlessMetrics.charts)[0] | undefined;
        before(() => {
          computeUsageMetric = serverlessMetrics.charts.find((chart) => {
            return chart.key === 'compute_usage';
          });
        });
        it('returns correct overall value', () => {
          const expectedValue =
            ((memoryTotal * billedDurationMs) / GBSeconds) * numberOfTransactionsCreated;
          expect(computeUsageMetric?.series[0].overallValue).to.equal(expectedValue);
        });

        it('returns correct mean value', () => {
          const expectedValue = (memoryTotal * billedDurationMs) / GBSeconds;
          const meanValue = meanBy(
            computeUsageMetric?.series[0]?.data.filter((item) => item.y !== 0),
            'y'
          );
          expect(meanValue).to.equal(expectedValue);
        });
      });
    });
  });
}
