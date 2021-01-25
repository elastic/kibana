/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import url from 'url';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import archives from '../../../common/fixtures/es_archiver/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  const transactionNames = [
    'DispatcherServlet#doGet',
    'APIRestController#customers',
    'APIRestController#order',
    'APIRestController#stats',
    'APIRestController#customerWhoBought',
    'APIRestController#customer',
    'APIRestController#topProducts',
    'APIRestController#orders',
    'APIRestController#product',
    'ResourceHttpRequestHandler',
    'APIRestController#products',
    'DispatcherServlet#doPost',
  ].join();

  describe('Transactions groups Metrics', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/metrics`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              latencyAggregationType: 'avg',
              transactionType: 'request',
              transactionNames,
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/metrics`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              latencyAggregationType: 'avg',
              transactionType: 'request',
              transactionNames,
            },
          })
        );

        expect(response.status).to.be(200);

        expectSnapshot(Object.keys(response.body)).toMatchInline(`
          Array [
            "DispatcherServlet#doGet",
            "APIRestController#customerWhoBought",
            "APIRestController#order",
            "APIRestController#customer",
            "ResourceHttpRequestHandler",
            "APIRestController#customers",
            "APIRestController#stats",
            "APIRestController#topProducts",
            "APIRestController#orders",
            "APIRestController#product",
            "APIRestController#products",
            "DispatcherServlet#doPost",
          ]
        `);

        const firstItem = response.body['DispatcherServlet#doGet'];

        expectSnapshot(
          firstItem.latency.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`9`);

        expectSnapshot(
          firstItem.throughput.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`9`);

        expectSnapshot(
          firstItem.errorRate.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`1`);
      });
    });
  });
}
