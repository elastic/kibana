/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import moment from 'moment';
import { pick } from 'lodash';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { removeEmptyCoordinates, roundNumber } from '../../utils';

type TransactionsGroupsComparisonStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/comparison_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];
  const transactionNames = ['DispatcherServlet#doGet', 'APIRestController#customers'];

  registry.when(
    'Transaction groups comparison statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/comparison_statistics`,
            query: {
              start,
              end,
              numBuckets: 20,
              latencyAggregationType: 'avg',
              transactionType: 'request',
              transactionNames: JSON.stringify(transactionNames),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });
    }
  );

  registry.when(
    'Transaction groups comparison statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/comparison_statistics`,
            query: {
              start,
              end,
              numBuckets: 20,
              transactionType: 'request',
              latencyAggregationType: 'avg',
              transactionNames: JSON.stringify(transactionNames),
            },
          })
        );

        expect(response.status).to.be(200);

        const {
          currentPeriod,
          previousPeriod,
        } = response.body as TransactionsGroupsComparisonStatistics;

        expect(Object.keys(currentPeriod)).to.be.eql(transactionNames);

        const currentPeriodItems = Object.values(currentPeriod).map((data) => data);
        const previousPeriodItems = Object.values(previousPeriod).map((data) => data);

        expect(previousPeriodItems.length).to.be.eql(0);

        transactionNames.forEach((transactionName) => {
          expect(currentPeriod[transactionName]).not.to.be.empty();
        });

        const firstItem = currentPeriodItems[0];
        const { latency, throughput, errorRate, impact } = pick(
          firstItem,
          'latency',
          'throughput',
          'errorRate',
          'impact'
        );

        expect(removeEmptyCoordinates(latency).length).to.be.greaterThan(0);
        expectSnapshot(latency).toMatch();

        expect(removeEmptyCoordinates(throughput).length).to.be.greaterThan(0);
        expectSnapshot(throughput).toMatch();

        expect(removeEmptyCoordinates(errorRate).length).to.be.greaterThan(0);
        expectSnapshot(errorRate).toMatch();

        expectSnapshot(roundNumber(impact)).toMatchInline(`"93.93"`);
      });

      it('returns the correct data for latency aggregation 99th percentile', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/comparison_statistics`,
            query: {
              start,
              end,
              numBuckets: 20,
              transactionType: 'request',
              latencyAggregationType: 'p99',
              transactionNames: JSON.stringify(transactionNames),
            },
          })
        );

        expect(response.status).to.be(200);

        const {
          currentPeriod,
          previousPeriod,
        } = response.body as TransactionsGroupsComparisonStatistics;

        expect(Object.keys(currentPeriod)).to.be.eql(transactionNames);

        const currentPeriodItems = Object.values(currentPeriod).map((data) => data);
        const previousPeriodItems = Object.values(previousPeriod).map((data) => data);

        expect(previousPeriodItems).to.be.empty();

        transactionNames.forEach((transactionName) => {
          expect(currentPeriod[transactionName]).not.to.be.empty();
        });

        const firstItem = currentPeriodItems[0];
        const { latency, throughput, errorRate } = pick(
          firstItem,
          'latency',
          'throughput',
          'errorRate'
        );

        expect(removeEmptyCoordinates(latency).length).to.be.greaterThan(0);
        expectSnapshot(latency).toMatch();

        expect(removeEmptyCoordinates(throughput).length).to.be.greaterThan(0);
        expect(removeEmptyCoordinates(errorRate).length).to.be.greaterThan(0);
      });

      it('returns empty when transaction name is not found', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/comparison_statistics`,
            query: {
              start,
              end,
              numBuckets: 20,
              transactionType: 'request',
              latencyAggregationType: 'avg',
              transactionNames: JSON.stringify(['foo']),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });

      describe('returns data with previous period', async () => {
        let currentPeriod: TransactionsGroupsComparisonStatistics['currentPeriod'];
        let previousPeriod: TransactionsGroupsComparisonStatistics['previousPeriod'];
        before(async () => {
          const response = await supertest.get(
            url.format({
              pathname: `/api/apm/services/opbeans-java/transactions/groups/comparison_statistics`,
              query: {
                numBuckets: 20,
                transactionType: 'request',
                latencyAggregationType: 'avg',
                transactionNames: JSON.stringify(transactionNames),
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                comparisonStart: start,
                comparisonEnd: moment(start).add(15, 'minutes').toISOString(),
              },
            })
          );

          expect(response.status).to.be(200);
          currentPeriod = response.body.currentPeriod;
          previousPeriod = response.body.previousPeriod;
        });

        it('returns correct number of items', () => {
          expect(Object.keys(currentPeriod)).to.be.eql(transactionNames);
          expect(Object.keys(previousPeriod)).to.be.eql(transactionNames);

          transactionNames.forEach((transactionName) => {
            expect(currentPeriod[transactionName]).not.to.be.empty();
            expect(previousPeriod[transactionName]).not.to.be.empty();
          });
        });

        it('returns correct latency data', () => {
          const currentPeriodItems = Object.values(currentPeriod).map((data) => data);
          const previousPeriodItems = Object.values(previousPeriod).map((data) => data);

          const currentPeriodFirstItem = currentPeriodItems[0];
          const previousPeriodFirstItem = previousPeriodItems[0];

          expect(removeEmptyCoordinates(currentPeriodFirstItem.latency).length).to.be.greaterThan(
            0
          );
          expect(removeEmptyCoordinates(previousPeriodFirstItem.latency).length).to.be.greaterThan(
            0
          );
          expectSnapshot(currentPeriodFirstItem.latency).toMatch();
          expectSnapshot(previousPeriodFirstItem.latency).toMatch();
        });

        it('returns correct throughput data', () => {
          const currentPeriodItems = Object.values(currentPeriod).map((data) => data);
          const previousPeriodItems = Object.values(previousPeriod).map((data) => data);

          const currentPeriodFirstItem = currentPeriodItems[0];
          const previousPeriodFirstItem = previousPeriodItems[0];

          expect(
            removeEmptyCoordinates(currentPeriodFirstItem.throughput).length
          ).to.be.greaterThan(0);
          expect(
            removeEmptyCoordinates(previousPeriodFirstItem.throughput).length
          ).to.be.greaterThan(0);
          expectSnapshot(currentPeriodFirstItem.throughput).toMatch();
          expectSnapshot(previousPeriodFirstItem.throughput).toMatch();
        });

        it('returns correct error rate data', () => {
          const currentPeriodItems = Object.values(currentPeriod).map((data) => data);
          const previousPeriodItems = Object.values(previousPeriod).map((data) => data);

          const currentPeriodFirstItem = currentPeriodItems[0];
          const previousPeriodFirstItem = previousPeriodItems[0];

          expect(removeEmptyCoordinates(currentPeriodFirstItem.errorRate).length).to.be.greaterThan(
            0
          );
          expect(
            removeEmptyCoordinates(previousPeriodFirstItem.errorRate).length
          ).to.be.greaterThan(0);
          expectSnapshot(currentPeriodFirstItem.errorRate).toMatch();
          expectSnapshot(previousPeriodFirstItem.errorRate).toMatch();
        });

        it('returns correct impact data', () => {
          const currentPeriodItems = Object.values(currentPeriod).map((data) => data);
          const previousPeriodItems = Object.values(previousPeriod).map((data) => data);

          const currentPeriodFirstItem = currentPeriodItems[0];
          const previousPeriodFirstItem = previousPeriodItems[0];

          expectSnapshot(roundNumber(currentPeriodFirstItem.impact)).toMatchInline(`"21.75"`);
          expectSnapshot(roundNumber(previousPeriodFirstItem.impact)).toMatchInline(`"96.94"`);
        });
      });
    }
  );
}
