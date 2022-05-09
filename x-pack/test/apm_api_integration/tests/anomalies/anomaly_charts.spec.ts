/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { range, omit } from 'lodash';
import { apm, timerange } from '@elastic/apm-synthtrace';
import { ServiceAnomalyTimeseries } from '@kbn/apm-plugin/common/anomaly_detection/service_anomaly_timeseries';
import { ApmMlDetectorType } from '@kbn/apm-plugin/common/anomaly_detection/apm_ml_detectors';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ApmApiError } from '../../common/apm_api_supertest';
import { createAndRunApmMlJob } from '../../common/utils/create_and_run_apm_ml_job';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const apmApiClient = getService('apmApiClient');
  const ml = getService('ml');

  const synthtraceEsClient = getService('synthtraceEsClient');

  async function statusOf(p: Promise<{ status: number }>) {
    try {
      const { status } = await p;
      return status;
    } catch (err) {
      if (err instanceof ApmApiError) {
        return err.res.status;
      }
      throw err;
    }
  }

  function getAnomalyCharts(
    {
      start,
      end,
      transactionType,
      serviceName,
    }: {
      start: string;
      end: string;
      transactionType: string;
      serviceName: string;
    },
    user = apmApiClient.readUser
  ) {
    return user({
      endpoint: 'GET /internal/apm/services/{serviceName}/anomaly_charts',
      params: {
        path: {
          serviceName,
        },
        query: {
          start,
          end,
          transactionType,
        },
      },
    });
  }

  registry.when(
    'fetching service anomalies with a basic license',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      it('returns a 501', async () => {
        const status = await statusOf(
          getAnomalyCharts({
            serviceName: 'a',
            transactionType: 'request',
            start: '2021-01-01T00:00:00.000Z',
            end: '2021-01-01T00:15:00.000Z',
          })
        );

        expect(status).to.eql(501);
      });
    }
  );

  registry.when(
    'fetching service anomalies with a trial license',
    { config: 'trial', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      const start = '2021-01-01T00:00:00.000Z';
      const end = '2021-01-08T00:15:00.000Z';

      const spikeStart = new Date('2021-01-03T00:00:00.000Z').getTime();
      const spikeEnd = new Date('2021-01-03T02:00:00.000Z').getTime();

      const NORMAL_DURATION = 100;
      const NORMAL_RATE = 1;

      before(async () => {
        const serviceA = apm.service('a', 'production', 'java').instance('a');

        const serviceB = apm.service('b', 'development', 'go').instance('b');

        const events = timerange(new Date(start).getTime(), new Date(end).getTime())
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const isInSpike = timestamp >= spikeStart && timestamp < spikeEnd;
            const count = isInSpike ? 4 : NORMAL_RATE;
            const duration = isInSpike ? 1000 : NORMAL_DURATION;
            const outcome = isInSpike ? 'failure' : 'success';

            return [
              ...range(0, count).flatMap((_) =>
                serviceA
                  .transaction('tx', 'request')
                  .timestamp(timestamp)
                  .duration(duration)
                  .outcome(outcome)
              ),
              serviceB
                .transaction('tx', 'Worker')
                .timestamp(timestamp)
                .duration(duration)
                .success(),
            ];
          });

        await synthtraceEsClient.index(events);
      });

      after(async () => {
        await synthtraceEsClient.clean();
      });

      it('returns a 403 for a user without access to ML', async () => {
        expect(
          await statusOf(
            getAnomalyCharts(
              {
                serviceName: 'a',
                transactionType: 'request',
                start,
                end,
              },
              apmApiClient.noMlAccessUser
            )
          )
        ).to.eql(403);
      });

      describe('without ml jobs', () => {
        it('returns a 200 for a user _with_ access to ML', async () => {
          const status = await statusOf(
            getAnomalyCharts({
              serviceName: 'a',
              transactionType: 'request',
              start,
              end,
            })
          );

          expect(status).to.eql(200);
        });
      });

      describe('with ml jobs', () => {
        before(async () => {
          await Promise.all([
            createAndRunApmMlJob({ environment: 'production', ml }),
            createAndRunApmMlJob({ environment: 'development', ml }),
          ]);
        });

        after(async () => {
          await ml.cleanMlIndices();
        });

        it('returns a 200 for a user _with_ access to ML', async () => {
          const status = await statusOf(
            getAnomalyCharts({
              serviceName: 'a',
              transactionType: 'request',
              start,
              end,
            })
          );

          expect(status).to.eql(200);
        });

        describe('inspecting the body', () => {
          let allAnomalyTimeseries: ServiceAnomalyTimeseries[];

          let latencySeries: ServiceAnomalyTimeseries | undefined;
          let throughputSeries: ServiceAnomalyTimeseries | undefined;
          let failureRateSeries: ServiceAnomalyTimeseries | undefined;

          before(async () => {
            allAnomalyTimeseries = (
              await getAnomalyCharts({
                serviceName: 'a',
                transactionType: 'request',
                start,
                end,
              })
            ).body.allAnomalyTimeseries;

            latencySeries = allAnomalyTimeseries.find(
              (spec) => spec.type === ApmMlDetectorType.txLatency
            );
            throughputSeries = allAnomalyTimeseries.find(
              (spec) => spec.type === ApmMlDetectorType.txThroughput
            );
            failureRateSeries = allAnomalyTimeseries.find(
              (spec) => spec.type === ApmMlDetectorType.txFailureRate
            );
          });

          it('returns model plots for all detectors and job ids for the given transaction type', () => {
            expect(allAnomalyTimeseries.length).to.eql(3);

            expect(
              allAnomalyTimeseries.every((spec) => spec.bounds.some((bound) => bound.y0 ?? 0 > 0))
            );
          });

          it('returns the correct metadata', () => {
            function omitTimeseriesData(series: ServiceAnomalyTimeseries | undefined) {
              return series ? omit(series, 'anomalies', 'bounds') : undefined;
            }

            expect(omitTimeseriesData(latencySeries)).to.eql({
              type: ApmMlDetectorType.txLatency,
              jobId: 'apm-tx-metrics-production',
              serviceName: 'a',
              environment: 'production',
              transactionType: 'request',
              version: 3,
            });

            expect(omitTimeseriesData(throughputSeries)).to.eql({
              type: ApmMlDetectorType.txThroughput,
              jobId: 'apm-tx-metrics-production',
              serviceName: 'a',
              environment: 'production',
              transactionType: 'request',
              version: 3,
            });

            expect(omitTimeseriesData(failureRateSeries)).to.eql({
              type: ApmMlDetectorType.txFailureRate,
              jobId: 'apm-tx-metrics-production',
              serviceName: 'a',
              environment: 'production',
              transactionType: 'request',
              version: 3,
            });
          });

          it('returns anomalies for during the spike', () => {
            const latencyAnomalies = latencySeries?.anomalies.filter(
              (anomaly) => anomaly.y ?? 0 > 0
            );

            const throughputAnomalies = throughputSeries?.anomalies.filter(
              (anomaly) => anomaly.y ?? 0 > 0
            );

            const failureRateAnomalies = failureRateSeries?.anomalies.filter(
              (anomaly) => anomaly.y ?? 0 > 0
            );

            expect(latencyAnomalies?.length).to.be.greaterThan(0);

            expect(throughputAnomalies?.length).to.be.greaterThan(0);

            expect(failureRateAnomalies?.length).to.be.greaterThan(0);

            expect(
              latencyAnomalies?.every(
                (anomaly) => anomaly.x >= spikeStart && (anomaly.actual ?? 0) > NORMAL_DURATION
              )
            );

            expect(
              throughputAnomalies?.every(
                (anomaly) => anomaly.x >= spikeStart && (anomaly.actual ?? 0) > NORMAL_RATE
              )
            );

            expect(
              failureRateAnomalies?.every(
                (anomaly) => anomaly.x >= spikeStart && (anomaly.actual ?? 0) > 0
              )
            );
          });
        });
      });
    }
  );
}
