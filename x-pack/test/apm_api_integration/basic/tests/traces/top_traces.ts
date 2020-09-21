/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import archives_metadata from '../../../common/archives_metadata';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Top traces', () => {
    describe('when data is not loaded ', () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          `/api/apm/traces?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(0);
        expect(response.body.isAggregationAccurate).to.be(true);
      });
    });

    describe('when data is loaded', () => {
      let response: any;
      before(async () => {
        await esArchiver.load(archiveName);
        response = await supertest.get(
          `/api/apm/traces?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );
      });
      after(() => esArchiver.unload(archiveName));

      it('returns the correct status code', async () => {
        expect(response.status).to.be(200);
      });

      it('returns the correct number of buckets', async () => {
        expectSnapshot(response.body.items.length).toMatchInline(`59`);
      });

      it('returns the correct buckets', async () => {
        const sortedItems = sortBy(response.body.items, 'impact');

        const firstItem = sortedItems[0];
        const lastItem = sortedItems[sortedItems.length - 1];

        const groups = sortedItems.map((item) => item.key).slice(0, 5);

        expectSnapshot(sortedItems).toMatch();

        expectSnapshot(firstItem).toMatchInline(`
          Object {
            "averageResponseTime": 1137,
            "impact": 0,
            "key": Object {
              "service.name": "opbeans-node",
              "transaction.name": "POST /api/orders",
            },
            "serviceName": "opbeans-node",
            "transactionName": "POST /api/orders",
            "transactionType": "request",
            "transactionsPerMinute": 0.0333333333333333,
          }
        `);

        expectSnapshot(lastItem).toMatchInline(`
          Object {
            "averageResponseTime": 1724883.75,
            "impact": 100,
            "key": Object {
              "service.name": "opbeans-python",
              "transaction.name": "opbeans.tasks.sync_customers",
            },
            "serviceName": "opbeans-python",
            "transactionName": "opbeans.tasks.sync_customers",
            "transactionType": "celery",
            "transactionsPerMinute": 1.2,
          }
        `);

        expectSnapshot(groups).toMatchInline(`
          Array [
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "POST /api/orders",
            },
            Object {
              "service.name": "opbeans-python",
              "transaction.name": "GET opbeans.views.stats",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "GET /api/customers/:id",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "GET /api/products/top",
            },
            Object {
              "service.name": "opbeans-ruby",
              "transaction.name": "Api::OrdersController#show",
            },
          ]
        `);
      });
    });
  });
}
