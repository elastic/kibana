/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import moment from 'moment';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/create_call_apm_api';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { ApmApiError } from '../../common/apm_api_supertest';

type ServicesDetailedStatisticsReturn =
  APIReturnType<'GET /internal/apm/services/detailed_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const { start, end } = metadata;
  const serviceNames = ['opbeans-java', 'opbeans-go'];

  registry.when(
    'Services detailed statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services/detailed_statistics`,
          params: {
            query: {
              start,
              end,
              serviceNames: JSON.stringify(serviceNames),
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
              offset: '1d',
              probability: 1,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.currentPeriod).to.be.empty();
        expect(response.body.previousPeriod).to.be.empty();
      });
    }
  );

  registry.when(
    'Services detailed statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let servicesDetailedStatistics: ServicesDetailedStatisticsReturn;
      before(async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services/detailed_statistics`,
          params: {
            query: {
              start,
              end,
              serviceNames: JSON.stringify(serviceNames),
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
              probability: 1,
            },
          },
        });
        expect(response.status).to.be(200);
        servicesDetailedStatistics = response.body;
      });
      it('returns current period data', async () => {
        expect(servicesDetailedStatistics.currentPeriod).not.to.be.empty();
      });
      it("doesn't returns previous period data", async () => {
        expect(servicesDetailedStatistics.previousPeriod).to.be.empty();
      });
      it('returns current data for requested service names', () => {
        serviceNames.forEach((serviceName) => {
          expect(servicesDetailedStatistics.currentPeriod[serviceName]).not.to.be.empty();
        });
      });
      it('returns correct statistics', () => {
        const statistics = servicesDetailedStatistics.currentPeriod[serviceNames[0]];

        expect(statistics.latency.length).to.be.greaterThan(0);
        expect(statistics.throughput.length).to.be.greaterThan(0);
        expect(statistics.transactionErrorRate.length).to.be.greaterThan(0);

        // latency
        const nonNullLantencyDataPoints = statistics.latency.filter(({ y }) => isFiniteNumber(y));
        expect(nonNullLantencyDataPoints.length).to.be.greaterThan(0);

        // throughput
        const nonNullThroughputDataPoints = statistics.throughput.filter(({ y }) =>
          isFiniteNumber(y)
        );
        expect(nonNullThroughputDataPoints.length).to.be.greaterThan(0);

        // transaction erro rate
        const nonNullTransactionErrorRateDataPoints = statistics.transactionErrorRate.filter(
          ({ y }) => isFiniteNumber(y)
        );
        expect(nonNullTransactionErrorRateDataPoints.length).to.be.greaterThan(0);
      });

      it('returns empty when empty service names is passed', async () => {
        try {
          await apmApiClient.readUser({
            endpoint: `GET /internal/apm/services/detailed_statistics`,
            params: {
              query: {
                start,
                end,
                serviceNames: JSON.stringify([]),
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
                probability: 1,
              },
            },
          });
          expect().fail('Expected API call to throw an error');
        } catch (error: unknown) {
          const apiError = error as ApmApiError;
          expect(apiError.res.status).eql(400);

          expect(apiError.res.body.message).eql('serviceNames cannot be empty');
        }
      });

      it('filters by environment', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services/detailed_statistics`,
          params: {
            query: {
              start,
              end,
              serviceNames: JSON.stringify(serviceNames),
              environment: 'production',
              kuery: '',
              probability: 1,
            },
          },
        });
        expect(response.status).to.be(200);
        expect(Object.keys(response.body.currentPeriod).length).to.be(1);
        expect(response.body.currentPeriod['opbeans-java']).not.to.be.empty();
      });
      it('filters by kuery', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services/detailed_statistics`,
          params: {
            query: {
              start,
              end,
              serviceNames: JSON.stringify(serviceNames),
              environment: 'ENVIRONMENT_ALL',
              kuery: 'transaction.type : "invalid_transaction_type"',
              probability: 1,
            },
          },
        });
        expect(response.status).to.be(200);
        expect(Object.keys(response.body.currentPeriod)).to.be.empty();
      });
    }
  );

  registry.when(
    'Services detailed statistics with time comparison',
    { config: 'basic', archives: [archiveName] },
    () => {
      let servicesDetailedStatistics: ServicesDetailedStatisticsReturn;
      before(async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services/detailed_statistics`,
          params: {
            query: {
              start: moment(end).subtract(15, 'minutes').toISOString(),
              end,
              serviceNames: JSON.stringify(serviceNames),
              offset: '15m',
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
              probability: 1,
            },
          },
        });

        expect(response.status).to.be(200);
        servicesDetailedStatistics = response.body;
      });
      it('returns current period data', async () => {
        expect(servicesDetailedStatistics.currentPeriod).not.to.be.empty();
      });
      it('returns previous period data', async () => {
        expect(servicesDetailedStatistics.previousPeriod).not.to.be.empty();
      });
      it('returns current data for requested service names', () => {
        serviceNames.forEach((serviceName) => {
          expect(servicesDetailedStatistics.currentPeriod[serviceName]).not.to.be.empty();
        });
      });
      it('returns previous data for requested service names', () => {
        serviceNames.forEach((serviceName) => {
          expect(servicesDetailedStatistics.currentPeriod[serviceName]).not.to.be.empty();
        });
      });
      it('returns correct statistics', () => {
        const currentPeriodStatistics = servicesDetailedStatistics.currentPeriod[serviceNames[0]];
        const previousPeriodStatistics = servicesDetailedStatistics.previousPeriod[serviceNames[0]];

        expect(currentPeriodStatistics.latency.length).to.be.greaterThan(0);
        expect(currentPeriodStatistics.throughput.length).to.be.greaterThan(0);
        expect(currentPeriodStatistics.transactionErrorRate.length).to.be.greaterThan(0);

        // latency
        const nonNullCurrentPeriodLantencyDataPoints = currentPeriodStatistics.latency.filter(
          ({ y }) => isFiniteNumber(y)
        );
        expect(nonNullCurrentPeriodLantencyDataPoints.length).to.be.greaterThan(0);

        // throughput
        const nonNullCurrentPeriodThroughputDataPoints = currentPeriodStatistics.throughput.filter(
          ({ y }) => isFiniteNumber(y)
        );
        expect(nonNullCurrentPeriodThroughputDataPoints.length).to.be.greaterThan(0);

        // transaction erro rate
        const nonNullCurrentPeriodTransactionErrorRateDataPoints =
          currentPeriodStatistics.transactionErrorRate.filter(({ y }) => isFiniteNumber(y));
        expect(nonNullCurrentPeriodTransactionErrorRateDataPoints.length).to.be.greaterThan(0);

        expect(previousPeriodStatistics.latency.length).to.be.greaterThan(0);
        expect(previousPeriodStatistics.throughput.length).to.be.greaterThan(0);
        expect(previousPeriodStatistics.transactionErrorRate.length).to.be.greaterThan(0);

        // latency
        const nonNullPreviousPeriodLantencyDataPoints = previousPeriodStatistics.latency.filter(
          ({ y }) => isFiniteNumber(y)
        );
        expect(nonNullPreviousPeriodLantencyDataPoints.length).to.be.greaterThan(0);

        // throughput
        const nonNullPreviousPeriodThroughputDataPoints =
          previousPeriodStatistics.throughput.filter(({ y }) => isFiniteNumber(y));
        expect(nonNullPreviousPeriodThroughputDataPoints.length).to.be.greaterThan(0);

        // transaction erro rate
        const nonNullPreviousPeriodTransactionErrorRateDataPoints =
          previousPeriodStatistics.transactionErrorRate.filter(({ y }) => isFiniteNumber(y));
        expect(nonNullPreviousPeriodTransactionErrorRateDataPoints.length).to.be.greaterThan(0);
      });
    }
  );
}
