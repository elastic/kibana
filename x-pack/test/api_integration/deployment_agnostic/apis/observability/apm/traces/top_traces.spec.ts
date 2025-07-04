/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import archives_metadata from '../constants/archives_metadata';
import { ARCHIVER_ROUTES } from '../constants/archiver';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');

  const archiveName = '8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const { start, end } = metadata;

  describe('Top traces', () => {
    describe('when data is not loaded', () => {
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

    describe('when data is loaded', () => {
      let response: any;
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES[archiveName]);
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

      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES[archiveName]);
      });

      it('returns the correct status code', () => {
        expect(response.status).to.be(200);
      });

      it('returns the correct number of buckets', () => {
        expectSnapshot(response.body.items.length).toMatchInline(`59`);
      });

      it('returns the correct buckets', () => {
        const sortedItems = sortBy(response.body.items, 'impact');

        const firstItem = sortedItems[0];
        const lastItem = sortedItems[sortedItems.length - 1];

        const groups = sortedItems.map((item) => item.key).slice(0, 5);

        expectSnapshot(sortedItems).toMatch();

        expectSnapshot(firstItem).toMatchInline(`
          Object {
            "agentName": "ruby",
            "averageResponseTime": 5664,
            "impact": 0,
            "key": Object {
              "service.name": "opbeans-ruby",
              "transaction.name": "Api::OrdersController#create",
            },
            "serviceName": "opbeans-ruby",
            "transactionName": "Api::OrdersController#create",
            "transactionType": "request",
            "transactionsPerMinute": 0.0166666666666667,
          }
        `);

        expectSnapshot(lastItem).toMatchInline(`
          Object {
            "agentName": "nodejs",
            "averageResponseTime": 1077989.66666667,
            "impact": 100,
            "key": Object {
              "service.name": "opbeans-node",
              "transaction.name": "Process payment",
            },
            "serviceName": "opbeans-node",
            "transactionName": "Process payment",
            "transactionType": "Worker",
            "transactionsPerMinute": 0.7,
          }
        `);

        expectSnapshot(groups).toMatchInline(`
          Array [
            Object {
              "service.name": "opbeans-ruby",
              "transaction.name": "Api::OrdersController#create",
            },
            Object {
              "service.name": "opbeans-java",
              "transaction.name": "APIRestController#products",
            },
            Object {
              "service.name": "opbeans-java",
              "transaction.name": "APIRestController#orders",
            },
            Object {
              "service.name": "opbeans-java",
              "transaction.name": "APIRestController#product",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "POST /api",
            },
          ]
        `);
      });
    });
  });
}
