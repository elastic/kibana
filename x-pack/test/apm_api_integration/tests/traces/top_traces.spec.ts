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

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const { start, end } = metadata;

  registry.when('Top traces when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await apmApiClient.readUser({
        endpoint: `GET /internal/apm/traces`,
        params: {
          query: {
            start,
            end,
            kuery: '',
            environment: 'ENVIRONMENT_ALL',
            probability: 1,
          },
        },
      });

      expect(response.status).to.be(200);
      expect(response.body.items.length).to.be(0);
    });
  });

  registry.when(
    'Top traces when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: any;
      before(async () => {
        response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/traces',
          params: {
            query: {
              start,
              end,
              kuery: '',
              environment: 'ENVIRONMENT_ALL',
              probability: 1,
            },
          },
        });
      });

      it('returns the correct status code', async () => {
        expect(response.status).to.be(200);
      });

      it('returns the correct number of buckets', async () => {
        expectSnapshot(response.body.items.length).toMatchInline(`81`);
      });

      it('returns the correct buckets', async () => {
        const sortedItems = sortBy(response.body.items, 'impact');

        const firstItem = sortedItems[0];
        const lastItem = sortedItems[sortedItems.length - 1];

        const groups = sortedItems.map((item) => item.key).slice(0, 5);

        expectSnapshot(sortedItems).toMatch();

        expectSnapshot(firstItem).toMatchInline(`
          Object {
            "agentName": "java",
            "averageResponseTime": 1639,
            "impact": 0,
            "key": Object {
              "service.name": "opbeans-java",
              "transaction.name": "DispatcherServlet#doPost",
            },
            "serviceName": "opbeans-java",
            "transactionName": "DispatcherServlet#doPost",
            "transactionType": "request",
            "transactionsPerMinute": 0.0333333333333333,
          }
        `);

        expectSnapshot(lastItem).toMatchInline(`
          Object {
            "agentName": "dotnet",
            "averageResponseTime": 5963775,
            "impact": 100,
            "key": Object {
              "service.name": "opbeans-dotnet",
              "transaction.name": "GET Orders/Get",
            },
            "serviceName": "opbeans-dotnet",
            "transactionName": "GET Orders/Get",
            "transactionType": "request",
            "transactionsPerMinute": 0.633333333333333,
          }
        `);

        expectSnapshot(groups).toMatchInline(`
          Array [
            Object {
              "service.name": "opbeans-java",
              "transaction.name": "DispatcherServlet#doPost",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "POST /api/orders",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "GET /api/products/:id",
            },
            Object {
              "service.name": "opbeans-dotnet",
              "transaction.name": "POST Orders/Post",
            },
            Object {
              "service.name": "opbeans-python",
              "transaction.name": "GET opbeans.views.product",
            },
          ]
        `);
      });
    }
  );
}
