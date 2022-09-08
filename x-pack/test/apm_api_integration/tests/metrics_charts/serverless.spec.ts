/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { apm, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
// import { roundNumber } from '../../utils';

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
      const COLD_START_DURATION_PYTHON = 4000;
      const COLD_START_DURATION_NODE = 0;
      const FAAS_DURATION = 4000;
      const TRANSACTION_DURATION = 1000;

      const numberOfTransactionsCreated = 15;
      const numberOfPythonInstances = 2;

      before(async () => {
        const instanceLambdaPython = apm
          .serverless({
            serviceName: 'lambda-python',
            environment: 'test',
            agentName: 'python',
            faasId: 'arn:aws:lambda:us-west-2:123456789012:function:lambda-python',
            coldStart: true,
            faasTriggerType: 'other',
          })
          .instance('instance python');

        const instanceLambdaPython2 = apm
          .serverless({
            serviceName: 'lambda-python',
            environment: 'test',
            agentName: 'python',
            faasId: 'arn:aws:lambda:us-west-2:123456789012:function:lambda-python-2',
            coldStart: true,
            faasTriggerType: 'other',
          })
          .instance('instance python 2');

        const instanceLambdaNode = apm
          .serverless({
            serviceName: 'lambda-node',
            environment: 'test',
            agentName: 'nodejs',
            faasId: 'arn:aws:lambda:us-west-2:123456789012:function:lambda-node',
            coldStart: false,
            faasTriggerType: 'other',
          })
          .instance('instance node');

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
            instanceLambdaPython
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
            instanceLambdaPython2
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
            instanceLambdaNode
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
            instanceLambdaPython
              .appMetrics({
                ...systemMetrics,
                'faas.billed_duration': BILLED_DURATION_MS,
                'faas.timeout': FAAS_TIMEOUT_MS,
                'faas.coldstart_duration': COLD_START_DURATION_PYTHON,
                'faas.duration': FAAS_DURATION,
              })
              .timestamp(timestamp),
            instanceLambdaPython2
              .appMetrics({
                ...systemMetrics,
                'faas.billed_duration': BILLED_DURATION_MS,
                'faas.timeout': FAAS_TIMEOUT_MS,
                'faas.coldstart_duration': COLD_START_DURATION_PYTHON,
                'faas.duration': FAAS_DURATION,
              })
              .timestamp(timestamp),
            instanceLambdaNode
              .appMetrics({
                ...systemMetrics,
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
          const { status, body } = await callApi('lambda-python', 'python');

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

        describe('Avg. Duration', () => {
          const transactionDurationInMicroSeconds = TRANSACTION_DURATION * 1000;
          [
            { title: 'Billed Duration', expectedValue: BILLED_DURATION_MS },
            { title: 'Transaction Duration', expectedValue: transactionDurationInMicroSeconds },
          ].map(({ title, expectedValue }) =>
            it(`returns correct ${title} value`, () => {
              const avgDurationMetric = metrics.charts.find((chart) => {
                return chart.key === 'avg_duration';
              });
              const series = avgDurationMetric?.series.find((item) => item.title === title);
              expect(series?.overallValue).to.eql(expectedValue);
              const meanValue = meanBy(series?.data, 'y');
              expect(meanValue).to.eql(expectedValue);
            })
          );
        });

        describe('Cold start duration', () => {
          let coldStartDurationMetric: typeof metrics['charts'][0] | undefined;
          before(() => {
            coldStartDurationMetric = metrics.charts.find((chart) => {
              return chart.key === 'cold_start_duration';
            });
          });
          it('returns correct overall value', () => {
            expect(coldStartDurationMetric?.series[0].overallValue).to.equal(
              COLD_START_DURATION_PYTHON
            );
          });

          it('returns correct mean value', () => {
            const meanValue = meanBy(coldStartDurationMetric?.series[0]?.data, 'y');
            expect(meanValue).to.equal(COLD_START_DURATION_PYTHON);
          });
        });

        describe('Cold start count', () => {
          let coldStartCountMetric: typeof metrics['charts'][0] | undefined;
          before(() => {
            coldStartCountMetric = metrics.charts.find((chart) => {
              return chart.key === 'cold_start_count';
            });
          });

          it('returns correct overall value', () => {
            expect(coldStartCountMetric?.series[0].overallValue).to.equal(
              numberOfTransactionsCreated * numberOfPythonInstances
            );
          });

          it('returns correct sum value', () => {
            const sumValue = sumBy(coldStartCountMetric?.series[0]?.data, 'y');
            expect(sumValue).to.equal(numberOfTransactionsCreated * numberOfPythonInstances);
          });
        });

        describe('memory usage', () => {
          const expectedFreeMemory = 1 - MEMORY_FREE / MEMORY_TOTAL;
          [
            { title: 'Max', expectedValue: expectedFreeMemory },
            { title: 'Average', expectedValue: expectedFreeMemory },
          ].map(({ title, expectedValue }) =>
            it(`returns correct ${title} value`, () => {
              const memoryUsageMetric = metrics.charts.find((chart) => {
                return chart.key === 'memory_usage_chart';
              });
              const series = memoryUsageMetric?.series.find((item) => item.title === title);
              expect(series?.overallValue).to.eql(expectedValue);
              const meanValue = meanBy(series?.data, 'y');
              expect(meanValue).to.eql(expectedValue);
            })
          );
        });

        describe('Compute usage', () => {
          const GBSeconds = 1024 * 1024 * 1024 * 1000;
          const expectedValue = (MEMORY_TOTAL * BILLED_DURATION_MS) / GBSeconds;
          let computeUsageMetric: typeof metrics['charts'][0] | undefined;
          before(() => {
            computeUsageMetric = metrics.charts.find((chart) => {
              return chart.key === 'compute_usage';
            });
          });
          it('returns correct overall value', () => {
            expect(computeUsageMetric?.series[0].overallValue).to.equal(expectedValue);
          });

          it('returns correct mean value', () => {
            const meanValue = meanBy(computeUsageMetric?.series[0]?.data, 'y');
            expect(meanValue).to.equal(expectedValue);
          });
        });

        describe('Active instances', () => {
          let activeInstancesMetric: typeof metrics['charts'][0] | undefined;
          before(() => {
            activeInstancesMetric = metrics.charts.find((chart) => {
              return chart.key === 'active_instances';
            });
          });
          it('returns correct overall value', () => {
            expect(activeInstancesMetric?.series[0].overallValue).to.equal(numberOfPythonInstances);
          });

          it('returns correct sum value', () => {
            const sumValue = sumBy(activeInstancesMetric?.series[0]?.data, 'y');
            expect(sumValue).to.equal(numberOfTransactionsCreated * numberOfPythonInstances);
          });
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
        describe('Avg. Duration', () => {
          const transactionDurationInMicroSeconds = TRANSACTION_DURATION * 1000;
          [
            { title: 'Billed Duration', expectedValue: BILLED_DURATION_MS },
            { title: 'Transaction Duration', expectedValue: transactionDurationInMicroSeconds },
          ].map(({ title, expectedValue }) =>
            it(`returns correct ${title} value`, () => {
              const avgDurationMetric = metrics.charts.find((chart) => {
                return chart.key === 'avg_duration';
              });
              const series = avgDurationMetric?.series.find((item) => item.title === title);
              expect(series?.overallValue).to.eql(expectedValue);
              const meanValue = meanBy(series?.data, 'y');
              expect(meanValue).to.eql(expectedValue);
            })
          );
        });

        describe('Cold start duration', () => {
          let coldStartDurationMetric: typeof metrics['charts'][0] | undefined;
          before(() => {
            coldStartDurationMetric = metrics.charts.find((chart) => {
              return chart.key === 'cold_start_duration';
            });
          });

          it('returns 0 overall value', () => {
            expect(coldStartDurationMetric?.series[0].overallValue).to.equal(
              COLD_START_DURATION_NODE
            );
          });

          it('returns 0 mean value', () => {
            const meanValue = meanBy(coldStartDurationMetric?.series[0]?.data, 'y');
            expect(meanValue).to.equal(COLD_START_DURATION_NODE);
          });
        });

        describe('Cold start count', () => {
          let coldStartCountMetric: typeof metrics['charts'][0] | undefined;
          before(() => {
            coldStartCountMetric = metrics.charts.find((chart) => {
              return chart.key === 'cold_start_count';
            });
          });

          it('does not return cold start count', () => {
            expect(coldStartCountMetric?.series).to.be.empty();
          });
        });

        describe('memory usage', () => {
          const expectedFreeMemory = 1 - MEMORY_FREE / MEMORY_TOTAL;
          [
            { title: 'Max', expectedValue: expectedFreeMemory },
            { title: 'Average', expectedValue: expectedFreeMemory },
          ].map(({ title, expectedValue }) =>
            it(`returns correct ${title} value`, () => {
              const memoryUsageMetric = metrics.charts.find((chart) => {
                return chart.key === 'memory_usage_chart';
              });
              const series = memoryUsageMetric?.series.find((item) => item.title === title);
              expect(series?.overallValue).to.eql(expectedValue);
              const meanValue = meanBy(series?.data, 'y');
              expect(meanValue).to.eql(expectedValue);
            })
          );
        });

        describe('Compute usage', () => {
          const GBSeconds = 1024 * 1024 * 1024 * 1000;
          const expectedValue = (MEMORY_TOTAL * BILLED_DURATION_MS) / GBSeconds;
          let computeUsageMetric: typeof metrics['charts'][0] | undefined;
          before(() => {
            computeUsageMetric = metrics.charts.find((chart) => {
              return chart.key === 'compute_usage';
            });
          });
          it('returns correct overall value', () => {
            expect(computeUsageMetric?.series[0].overallValue).to.equal(expectedValue);
          });

          it('returns correct mean value', () => {
            const meanValue = meanBy(computeUsageMetric?.series[0]?.data, 'y');
            expect(meanValue).to.equal(expectedValue);
          });
        });

        describe('Active instances', () => {
          let activeInstancesMetric: typeof metrics['charts'][0] | undefined;
          before(() => {
            activeInstancesMetric = metrics.charts.find((chart) => {
              return chart.key === 'active_instances';
            });
          });
          it('returns correct overall value', () => {
            // there's only one node instance
            expect(activeInstancesMetric?.series[0].overallValue).to.equal(1);
          });

          it('returns correct sum value', () => {
            const sumValue = sumBy(activeInstancesMetric?.series[0]?.data, 'y');
            expect(sumValue).to.equal(numberOfTransactionsCreated);
          });
        });
      });
    }
  );
}
