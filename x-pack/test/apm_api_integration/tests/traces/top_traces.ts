/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);

  registry.when('Top traces when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await supertest.get(`/api/apm/traces?start=${start}&end=${end}`);

      expect(response.status).to.be(200);
      expect(response.body.items.length).to.be(0);
      expect(response.body.isAggregationAccurate).to.be(true);
    });
  });

  registry.when(
    'Top traces when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: any;
      before(async () => {
        response = await supertest.get(`/api/apm/traces?start=${start}&end=${end}`);
      });

      it('returns the correct status code', async () => {
        expect(response.status).to.be(200);
      });

      it('returns the correct number of buckets', async () => {
        expectSnapshot(response.body.items.length).toMatchInline(`80`);
      });

      it('returns the correct buckets', async () => {
        const sortedItems = sortBy(response.body.items, 'impact');

        const firstItem = sortedItems[0];
        const lastItem = sortedItems[sortedItems.length - 1];

        const groups = sortedItems.map((item) => item.key).slice(0, 5);

        expectSnapshot(sortedItems).toMatch();

        expectSnapshot(firstItem).toMatchInline(`
          Object {
            "averageResponseTime": 1215,
            "impact": 0,
            "key": Object {
              "service.name": "opbeans-dotnet",
              "transaction.name": "POST Orders/Post",
            },
            "serviceName": "opbeans-dotnet",
            "transactionName": "POST Orders/Post",
            "transactionType": "request",
            "transactionsPerMinute": 0.0666666666666667,
          }
        `);

        expectSnapshot(lastItem).toMatchInline(`
          Object {
            "averageResponseTime": 2060176.2972973,
            "impact": 100,
            "key": Object {
              "service.name": "opbeans-python",
              "transaction.name": "opbeans.tasks.sync_customers",
            },
            "serviceName": "opbeans-python",
            "transactionName": "opbeans.tasks.sync_customers",
            "transactionType": "celery",
            "transactionsPerMinute": 1.23333333333333,
          }
        `);

        expectSnapshot(groups).toMatchInline(`
          Array [
            Object {
              "service.name": "opbeans-dotnet",
              "transaction.name": "POST Orders/Post",
            },
            Object {
              "service.name": "opbeans-ruby",
              "transaction.name": "Api::OrdersController#create",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "GET /api/orders/:id",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "GET /api/types",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "POST /api",
            },
          ]
        `);
      });
    }
  );
}
