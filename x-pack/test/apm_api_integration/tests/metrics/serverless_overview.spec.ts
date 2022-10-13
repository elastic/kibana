/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { Coordinate } from '@kbn/apm-plugin/typings/timeseries';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(serviceName: string) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/metrics/serverless`,
      params: {
        path: { serviceName },
        query: {
          environment: 'test',
          kuery: '',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
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
      const expectedMemoryUsedRate = (MEMORY_TOTAL - MEMORY_FREE) / MEMORY_TOTAL;
      const expectedMemoryUsed = MEMORY_TOTAL - MEMORY_FREE;
      const BILLED_DURATION_MS = 4000;
      const FAAS_TIMEOUT_MS = 10000;
      const COLD_START_DURATION_PYTHON = 4000;
      const COLD_START_DURATION_NODE = 0;
      const FAAS_DURATION = 4000;
      const TRANSACTION_DURATION = 1000;

      const numberOfTransactionsCreated = 15;

      const pythonServerlessFunctionNames = ['fn-lambda-python', 'fn-lambda-python-2'];
      const PYTHON_INSTANCE_NAME = 'instance_A';

      before(async () => {
        const cloudFields = {
          'cloud.provider': 'aws',
          'cloud.service.name': 'lambda',
          'cloud.region': 'us-west-2',
        };

        const [instanceLambdaPython, instanceLambdaPython2] = pythonServerlessFunctionNames.map(
          (functionName) => {
            return apm
              .serverlessFunction({
                serviceName: 'lambda-python',
                environment: 'test',
                agentName: 'python',
                functionName,
              })
              .instance({ instanceName: PYTHON_INSTANCE_NAME, ...cloudFields });
          }
        );

        const instanceLambdaNode = apm
          .serverlessFunction({
            serviceName: 'lambda-node',
            environment: 'test',
            agentName: 'nodejs',
            functionName: 'fn-lambda-node',
          })
          .instance({ instanceName: 'instance_B', ...cloudFields });

        const systemMemory = {
          free: MEMORY_FREE,
          total: MEMORY_TOTAL,
        };

        const transactionsEvents = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => [
            instanceLambdaPython
              .invocation()
              .billedDuration(BILLED_DURATION_MS)
              .coldStart(true)
              .coldStartDuration(COLD_START_DURATION_PYTHON)
              .faasDuration(FAAS_DURATION)
              .faasTimeout(FAAS_TIMEOUT_MS)
              .memory(systemMemory)
              .timestamp(timestamp)
              .duration(TRANSACTION_DURATION)
              .success(),
            instanceLambdaPython2
              .invocation()
              .billedDuration(BILLED_DURATION_MS)
              .coldStart(true)
              .coldStartDuration(COLD_START_DURATION_PYTHON)
              .faasDuration(FAAS_DURATION)
              .faasTimeout(FAAS_TIMEOUT_MS)
              .memory(systemMemory)
              .timestamp(timestamp)
              .duration(TRANSACTION_DURATION)
              .success(),
            instanceLambdaNode
              .invocation()
              .billedDuration(BILLED_DURATION_MS)
              .coldStart(false)
              .coldStartDuration(COLD_START_DURATION_NODE)
              .faasDuration(FAAS_DURATION)
              .faasTimeout(FAAS_TIMEOUT_MS)
              .memory(systemMemory)
              .timestamp(timestamp)
              .duration(TRANSACTION_DURATION)
              .success(),
          ]);

        await synthtraceEsClient.index(transactionsEvents);
      });

      after(() => synthtraceEsClient.clean());

      describe('Python service', () => {
        let serverlessMetrics: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless'>;
        before(async () => {
          const response = await callApi('lambda-python');
          serverlessMetrics = response.body;
        });

        describe('serverless function summary', () => {
          it('returns correct memory avg', () => {
            expect(serverlessMetrics.serverlessSummary.memoryUsageAvgRate).to.eql(
              expectedMemoryUsedRate
            );
          });
          it('returns correct serverless function total', () => {
            expect(serverlessMetrics.serverlessSummary.serverlessFunctionsTotal).to.eql(
              pythonServerlessFunctionNames.length
            );
          });
          it('returns correct serverless duration avg', () => {
            expect(serverlessMetrics.serverlessSummary.serverlessDurationAvg).to.eql(FAAS_DURATION);
          });
          it('returns correct billed duration avg', () => {
            expect(serverlessMetrics.serverlessSummary.serverlessDurationAvg).to.eql(
              BILLED_DURATION_MS
            );
          });
        });

        describe('serverless functions overview', () => {
          it('returns correct number of serverless functions', () => {
            expect(
              serverlessMetrics.serverlessFunctionsOverview.map((item) => {
                return item.serverlessFunctionName;
              })
            ).to.eql(pythonServerlessFunctionNames);
          });
          it('returns correct values for all serverless functions', () => {
            pythonServerlessFunctionNames.forEach((name) => {
              const functionOverview = serverlessMetrics.serverlessFunctionsOverview.find(
                (item) => item.serverlessFunctionName === name
              );

              expect(functionOverview?.serverlessDurationAvg).to.eql(FAAS_DURATION);
              expect(functionOverview?.serverlessDurationAvg).to.eql(BILLED_DURATION_MS);
              expect(functionOverview?.coldStartCount).to.eql(numberOfTransactionsCreated);
              expect(functionOverview?.avgMemoryUsed).to.eql(expectedMemoryUsed);
              expect(functionOverview?.memorySize).to.eql(MEMORY_TOTAL);
            });
          });
        });

        describe('serverless active instances overview', () => {
          it('returns two serverless functions from the same instace', () => {
            expect(
              serverlessMetrics.serverlessActiveInstancesOverview.map((item) => {
                return {
                  serverlessFunctionName: item.serverlessFunctionName,
                  instance: item.activeInstanceName,
                };
              })
            ).to.eql(
              pythonServerlessFunctionNames.map((name) => {
                return { serverlessFunctionName: name, instance: PYTHON_INSTANCE_NAME };
              })
            );
          });

          it('returns correct values for all serverless functions', () => {
            pythonServerlessFunctionNames.forEach((name) => {
              const activeInstanceOverview =
                serverlessMetrics.serverlessActiveInstancesOverview.find(
                  (item) => item.serverlessFunctionName === name
                );

              expect(activeInstanceOverview?.serverlessDurationAvg).to.eql(FAAS_DURATION);
              expect(activeInstanceOverview?.serverlessDurationAvg).to.eql(BILLED_DURATION_MS);
              expect(activeInstanceOverview?.avgMemoryUsed).to.eql(expectedMemoryUsed);
              expect(activeInstanceOverview?.memorySize).to.eql(MEMORY_TOTAL);
            });
          });

          describe('timeseries', () => {
            it('returns correct mean values', () => {
              pythonServerlessFunctionNames.forEach((name) => {
                const activeInstanceOverview =
                  serverlessMetrics.serverlessActiveInstancesOverview.find(
                    (item) => item.serverlessFunctionName === name
                  );

                function removeNullAndZeroValue(coordinate: Coordinate) {
                  return coordinate.y !== null && coordinate.y !== 0;
                }

                const meanDuration = meanBy(
                  activeInstanceOverview?.timeseries.serverlessDuration.filter(
                    removeNullAndZeroValue
                  ),
                  'y'
                );
                expect(meanDuration).to.eql(FAAS_DURATION);

                const meanBilledDuration = meanBy(
                  activeInstanceOverview?.timeseries.billedDuration.filter(removeNullAndZeroValue),
                  'y'
                );
                expect(meanBilledDuration).to.eql(BILLED_DURATION_MS);

                const meanAvgMemoryUsed = meanBy(
                  activeInstanceOverview?.timeseries.avgMemoryUsed.filter(removeNullAndZeroValue),
                  'y'
                );
                expect(meanAvgMemoryUsed).to.eql(expectedMemoryUsed);

                const meanMemorySize = meanBy(
                  activeInstanceOverview?.timeseries.memorySize.filter(removeNullAndZeroValue),
                  'y'
                );
                expect(meanMemorySize).to.eql(MEMORY_TOTAL);
              });
            });
          });
        });

        describe('metrics', () => {
          it('returns all metrics chart', () => {
            expect(serverlessMetrics.metricCharts.length).to.be.greaterThan(0);
            expect(serverlessMetrics.metricCharts.map(({ title }) => title).sort()).to.eql([
              'Active instances',
              'Avg. Duration',
              'Cold start',
              'Cold start duration',
              'Compute usage',
              'System memory usage',
            ]);
          });

          describe('Avg. Duration', () => {
            const transactionDurationInMicroSeconds = TRANSACTION_DURATION * 1000;
            [
              { title: 'Billed Duration', expectedValue: BILLED_DURATION_MS * 1000 },
              { title: 'Transaction Duration', expectedValue: transactionDurationInMicroSeconds },
            ].map(({ title, expectedValue }) =>
              it(`returns correct ${title} value`, () => {
                const avgDurationMetric = serverlessMetrics.metricCharts.find((chart) => {
                  return chart.key === 'avg_duration';
                });
                const series = avgDurationMetric?.series.find((item) => item.title === title);
                expect(series?.overallValue).to.eql(expectedValue);
                const meanValue = meanBy(
                  series?.data.filter((item) => item.y !== null),
                  'y'
                );
                expect(meanValue).to.eql(expectedValue);
              })
            );
          });

          describe('Cold start duration', () => {
            let coldStartDurationMetric: typeof serverlessMetrics.metricCharts[0] | undefined;
            before(() => {
              coldStartDurationMetric = serverlessMetrics.metricCharts.find((chart) => {
                return chart.key === 'cold_start_duration';
              });
            });
            it('returns correct overall value', () => {
              expect(coldStartDurationMetric?.series[0].overallValue).to.equal(
                COLD_START_DURATION_PYTHON * 1000
              );
            });

            it('returns correct mean value', () => {
              const meanValue = meanBy(
                coldStartDurationMetric?.series[0]?.data.filter((item) => item.y !== null),
                'y'
              );
              expect(meanValue).to.equal(COLD_START_DURATION_PYTHON * 1000);
            });
          });

          describe('Cold start count', () => {
            let coldStartCountMetric: typeof serverlessMetrics.metricCharts[0] | undefined;
            before(() => {
              coldStartCountMetric = serverlessMetrics.metricCharts.find((chart) => {
                return chart.key === 'cold_start_count';
              });
            });

            it('returns correct overall value', () => {
              expect(coldStartCountMetric?.series[0].overallValue).to.equal(
                numberOfTransactionsCreated * pythonServerlessFunctionNames.length
              );
            });

            it('returns correct sum value', () => {
              const sumValue = sumBy(
                coldStartCountMetric?.series[0]?.data.filter((item) => item.y !== null),
                'y'
              );
              expect(sumValue).to.equal(
                numberOfTransactionsCreated * pythonServerlessFunctionNames.length
              );
            });
          });

          describe('memory usage', () => {
            const expectedFreeMemory = 1 - MEMORY_FREE / MEMORY_TOTAL;
            [
              { title: 'Max', expectedValue: expectedFreeMemory },
              { title: 'Average', expectedValue: expectedFreeMemory },
            ].map(({ title, expectedValue }) =>
              it(`returns correct ${title} value`, () => {
                const memoryUsageMetric = serverlessMetrics.metricCharts.find((chart) => {
                  return chart.key === 'memory_usage_chart';
                });
                const series = memoryUsageMetric?.series.find((item) => item.title === title);
                expect(series?.overallValue).to.eql(expectedValue);
                const meanValue = meanBy(
                  series?.data.filter((item) => item.y !== null),
                  'y'
                );
                expect(meanValue).to.eql(expectedValue);
              })
            );
          });

          describe('Compute usage', () => {
            const GBSeconds = 1024 * 1024 * 1024 * 1000;
            const expectedValue = (MEMORY_TOTAL * BILLED_DURATION_MS) / GBSeconds;
            let computeUsageMetric: typeof serverlessMetrics.metricCharts[0] | undefined;
            before(() => {
              computeUsageMetric = serverlessMetrics.metricCharts.find((chart) => {
                return chart.key === 'compute_usage';
              });
            });
            it('returns correct overall value', () => {
              expect(computeUsageMetric?.series[0].overallValue).to.equal(expectedValue);
            });

            it('returns correct mean value', () => {
              const meanValue = meanBy(
                computeUsageMetric?.series[0]?.data.filter((item) => item.y !== 0),
                'y'
              );
              expect(meanValue).to.equal(expectedValue);
            });
          });

          describe('Active instances', () => {
            let activeInstancesMetric: typeof serverlessMetrics.metricCharts[0] | undefined;
            before(() => {
              activeInstancesMetric = serverlessMetrics.metricCharts.find((chart) => {
                return chart.key === 'active_instances';
              });
            });
            it('returns correct overall value', () => {
              expect(activeInstancesMetric?.series[0].overallValue).to.equal(1);
            });

            it('returns correct sum value', () => {
              const sumValue = sumBy(
                activeInstancesMetric?.series[0]?.data.filter((item) => item.y !== 0),
                'y'
              );
              expect(sumValue).to.equal(numberOfTransactionsCreated);
            });
          });
        });
      });
    }
  );
}
