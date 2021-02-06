/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
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
    'Transaction groups agg results when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/comparison_statistics`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              latencyAggregationType: 'avg',
              transactionType: 'request',
              transactionNames: JSON.stringify(transactionNames),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.empty();
      });
    }
  );

  registry.when(
    'Transaction groups agg results when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/comparison_statistics`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              transactionType: 'request',
              latencyAggregationType: 'avg',
              transactionNames: JSON.stringify(transactionNames),
            },
          })
        );

        expect(response.status).to.be(200);

        const transactionsGroupsComparisonStatistics = response.body as TransactionsGroupsComparisonStatistics;

        expect(Object.keys(transactionsGroupsComparisonStatistics).length).to.be.eql(
          transactionNames.length
        );

        transactionNames.map((transactionName) => {
          expect(transactionsGroupsComparisonStatistics[transactionName]).not.to.be.empty();
        });

        const { latency, throughput, errorRate, impact } = transactionsGroupsComparisonStatistics[
          transactionNames[0]
        ];

        expect(removeEmptyCoordinates(latency).length).to.be.greaterThan(0);
        expectSnapshot(latency).toMatch();

        expect(removeEmptyCoordinates(throughput).length).to.be.greaterThan(0);
        expectSnapshot(throughput).toMatch();

        expect(removeEmptyCoordinates(errorRate).length).to.be.greaterThan(0);
        expectSnapshot(errorRate).toMatch();

        expectSnapshot(roundNumber(impact)).toMatchInline(`"93.93"`);
      });

      it('returns the correct for latency aggregation 99th percentile', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/comparison_statistics`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              transactionType: 'request',
              latencyAggregationType: 'p99',
              transactionNames: JSON.stringify(transactionNames),
            },
          })
        );

        expect(response.status).to.be(200);

        const transactionsGroupsComparisonStatistics = response.body as TransactionsGroupsComparisonStatistics;

        expect(Object.keys(transactionsGroupsComparisonStatistics).length).to.be.eql(
          transactionNames.length
        );

        transactionNames.map((transactionName) => {
          expect(transactionsGroupsComparisonStatistics[transactionName]).not.to.be.empty();
        });

        const { latency, throughput, errorRate } = transactionsGroupsComparisonStatistics[
          transactionNames[0]
        ];
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
              uiFilters: '{}',
              numBuckets: 20,
              transactionType: 'request',
              latencyAggregationType: 'avg',
              transactionNames: JSON.stringify(['foo']),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.empty();
      });
    }
  );
}
