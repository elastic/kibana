/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, last, sumBy } from 'lodash';
import moment from 'moment';
import { isFiniteNumber } from '../../../../../plugins/apm/common/utils/is_finite_number';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '../../../../../plugins/apm/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '../../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { config, generateData } from './generate_data';
import { getErrorGroupIds } from './get_error_group_ids';

type ErrorGroupsDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics`,
      params: {
        path: { serviceName, ...overrides?.path },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          numBuckets: 20,
          groupIds: JSON.stringify(['foo']),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
  }

  registry.when(
    'Error groups detailed statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await callApi();
        expect(response.status).to.be(200);
        expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });
    }
  );

  registry.when(
    'Error groups detailed statistics',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('when data is loaded', () => {
        const { PROD_LIST_ERROR_RATE, PROD_ID_ERROR_RATE } = config;
        before(async () => {
          await generateData({ serviceName, start, end, synthtraceEsClient });
        });

        after(() => synthtraceEsClient.clean());

        describe('without data comparison', () => {
          let errorGroupsDetailedStatistics: ErrorGroupsDetailedStatistics;
          let errorIds: string[] = [];
          before(async () => {
            errorIds = await getErrorGroupIds({ serviceName, start, end, apmApiClient });
            const response = await callApi({
              query: {
                groupIds: JSON.stringify(errorIds),
              },
            });
            errorGroupsDetailedStatistics = response.body;
          });

          it('return detailed statistics for all errors found', () => {
            expect(Object.keys(errorGroupsDetailedStatistics.currentPeriod).sort()).to.eql(
              errorIds
            );
          });

          it('returns correct number of occurrencies', () => {
            const numberOfBuckets = 15;
            const detailedStatisticsOccurrenciesSum = Object.values(
              errorGroupsDetailedStatistics.currentPeriod
            )
              .sort()
              .map(({ timeseries }) => {
                return sumBy(timeseries, 'y');
              });

            expect(detailedStatisticsOccurrenciesSum).to.eql([
              PROD_ID_ERROR_RATE * numberOfBuckets,
              PROD_LIST_ERROR_RATE * numberOfBuckets,
            ]);
          });
        });

        describe('return empty state when invalid group id', () => {
          let errorGroupsDetailedStatistics: ErrorGroupsDetailedStatistics;
          before(async () => {
            const response = await callApi({
              query: {
                groupIds: JSON.stringify(['foo']),
              },
            });
            errorGroupsDetailedStatistics = response.body;
          });

          it('returns empty state', () => {
            expect(errorGroupsDetailedStatistics).to.be.eql({
              currentPeriod: {},
              previousPeriod: {},
            });
          });
        });

        describe('with comparison', () => {
          let errorGroupsDetailedStatistics: ErrorGroupsDetailedStatistics;
          let errorIds: string[] = [];
          before(async () => {
            errorIds = await getErrorGroupIds({ serviceName, start, end, apmApiClient });
            const response = await callApi({
              query: {
                groupIds: JSON.stringify(errorIds),
                start: moment(end).subtract(7, 'minutes').toISOString(),
                end: new Date(end).toISOString(),
                offset: '7m',
              },
            });
            errorGroupsDetailedStatistics = response.body;
          });

          it('returns some data', () => {
            expect(
              Object.keys(errorGroupsDetailedStatistics.currentPeriod).length
            ).to.be.greaterThan(0);
            expect(
              Object.keys(errorGroupsDetailedStatistics.previousPeriod).length
            ).to.be.greaterThan(0);

            const hasCurrentPeriodData = Object.values(
              errorGroupsDetailedStatistics.currentPeriod
            )[0].timeseries.some(({ y }) => isFiniteNumber(y));

            const hasPreviousPeriodData = Object.values(
              errorGroupsDetailedStatistics.previousPeriod
            )[0].timeseries.some(({ y }) => isFiniteNumber(y));

            expect(hasCurrentPeriodData).to.equal(true);
            expect(hasPreviousPeriodData).to.equal(true);
          });

          it('has same start time for both periods', () => {
            expect(
              first(Object.values(errorGroupsDetailedStatistics.currentPeriod)[0].timeseries)?.x
            ).to.equal(
              first(Object.values(errorGroupsDetailedStatistics.previousPeriod)[0].timeseries)?.x
            );
          });

          it('has same end time for both periods', () => {
            expect(
              last(Object.values(errorGroupsDetailedStatistics.currentPeriod)[0].timeseries)?.x
            ).to.equal(
              last(Object.values(errorGroupsDetailedStatistics.previousPeriod)[0].timeseries)?.x
            );
          });

          it('returns same number of buckets for both periods', () => {
            expect(
              Object.values(errorGroupsDetailedStatistics.currentPeriod)[0].timeseries.length
            ).to.equal(
              Object.values(errorGroupsDetailedStatistics.previousPeriod)[0].timeseries.length
            );
          });
        });
      });
    }
  );
}
