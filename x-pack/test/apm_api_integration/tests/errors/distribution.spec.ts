/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { first, last, sumBy } from 'lodash';
import { isFiniteNumber } from '@kbn/apm-plugin/common/utils/is_finite_number';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { config, generateData } from './generate_data';

type ErrorsDistribution =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/distribution'>['params']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/distribution',
      params: {
        path: {
          serviceName,
          ...overrides?.path,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
    return response;
  }

  registry.when('when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(response.body.currentPeriod.length).to.be(0);
      expect(response.body.previousPeriod.length).to.be(0);
    });
  });

  registry.when(
    'when data is loaded',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('errors distribution', () => {
        const { appleTransaction, bananaTransaction } = config;
        before(async () => {
          await generateData({ serviceName, start, end, synthtraceEsClient });
        });

        after(() => synthtraceEsClient.clean());

        describe('without comparison', () => {
          let errorsDistribution: ErrorsDistribution;
          before(async () => {
            const response = await callApi();
            errorsDistribution = response.body;
          });

          it('displays combined number of occurrences', () => {
            const countSum = sumBy(errorsDistribution.currentPeriod, 'y');
            const numberOfBuckets = 15;
            expect(countSum).to.equal(
              (appleTransaction.failureRate + bananaTransaction.failureRate) * numberOfBuckets
            );
          });
        });

        describe('displays occurrences for type "apple transaction" only', () => {
          let errorsDistribution: ErrorsDistribution;
          before(async () => {
            const response = await callApi({
              query: { kuery: `error.exception.type:"${appleTransaction.name}"` },
            });
            errorsDistribution = response.body;
          });
          it('displays combined number of occurrences', () => {
            const countSum = sumBy(errorsDistribution.currentPeriod, 'y');
            const numberOfBuckets = 15;
            expect(countSum).to.equal(appleTransaction.failureRate * numberOfBuckets);
          });
        });

        describe('with comparison', () => {
          describe('when data is returned', () => {
            let errorsDistribution: ErrorsDistribution;
            before(async () => {
              const fiveMinutes = 5 * 60 * 1000;
              const response = await callApi({
                query: {
                  start: new Date(end - fiveMinutes).toISOString(),
                  end: new Date(end).toISOString(),
                  offset: '5m',
                },
              });
              errorsDistribution = response.body;
            });
            it('returns some data', () => {
              const hasCurrentPeriodData = errorsDistribution.currentPeriod.some(({ y }) =>
                isFiniteNumber(y)
              );

              const hasPreviousPeriodData = errorsDistribution.previousPeriod.some(({ y }) =>
                isFiniteNumber(y)
              );

              expect(hasCurrentPeriodData).to.equal(true);
              expect(hasPreviousPeriodData).to.equal(true);
            });

            it('has same start time for both periods', () => {
              expect(first(errorsDistribution.currentPeriod)?.x).to.equal(
                first(errorsDistribution.previousPeriod)?.x
              );
            });

            it('has same end time for both periods', () => {
              expect(last(errorsDistribution.currentPeriod)?.x).to.equal(
                last(errorsDistribution.previousPeriod)?.x
              );
            });

            it('returns same number of buckets for both periods', () => {
              expect(errorsDistribution.currentPeriod.length).to.equal(
                errorsDistribution.previousPeriod.length
              );
            });
          });

          describe('when no data is returned', () => {
            let errorsDistribution: ErrorsDistribution;
            before(async () => {
              const response = await callApi({
                query: {
                  start: '2021-01-03T00:00:00.000Z',
                  end: '2021-01-03T00:15:00.000Z',
                  offset: '1d',
                },
              });
              errorsDistribution = response.body;
            });

            it('has same start time for both periods', () => {
              expect(first(errorsDistribution.currentPeriod)?.x).to.equal(
                first(errorsDistribution.previousPeriod)?.x
              );
            });

            it('has same end time for both periods', () => {
              expect(last(errorsDistribution.currentPeriod)?.x).to.equal(
                last(errorsDistribution.previousPeriod)?.x
              );
            });

            it('returns same number of buckets for both periods', () => {
              expect(errorsDistribution.currentPeriod.length).to.equal(
                errorsDistribution.previousPeriod.length
              );
            });
          });
        });
      });
    }
  );
}
