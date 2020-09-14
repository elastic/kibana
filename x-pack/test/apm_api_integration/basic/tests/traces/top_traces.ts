/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { sortBy, omit } from 'lodash';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Top traces', () => {
    describe('when data is not loaded ', () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          `/api/apm/traces?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatchInline(`
          Object {
            "bucketSize": 1000,
            "isAggregationAccurate": true,
            "items": Array [],
          }
        `);
      });
    });

    describe('when data is loaded', () => {
      let response: any;
      before(async () => {
        await esArchiver.load('8.0.0');
        response = await supertest.get(
          `/api/apm/traces?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );
      });
      after(() => esArchiver.unload('8.0.0'));

      it('returns the correct status code', async () => {
        expect(response.status).to.be(200);
      });

      it('returns the correct number of buckets', async () => {
        expectSnapshot(response.body.items.length).toMatchInline(`33`);
      });

      it('returns the correct buckets', async () => {
        const responseWithoutSamples = sortBy(
          response.body.items.map((item: any) => omit(item, 'sample')),
          'impact'
        );

        const firstItem = responseWithoutSamples[0];
        const lastItem = responseWithoutSamples[responseWithoutSamples.length - 1];

        const groups = responseWithoutSamples.map((item) => item.key).slice(0, 5);

        expectSnapshot(responseWithoutSamples).toMatch();

        expectSnapshot(firstItem).toMatchInline(`
          Object {
            "averageResponseTime": 2577,
            "impact": 0,
            "key": Object {
              "service.name": "opbeans-node",
              "transaction.name": "GET /throw-error",
            },
            "transactionsPerMinute": 0.5,
          }
        `);

        expectSnapshot(lastItem).toMatchInline(`
          Object {
            "averageResponseTime": 1745009,
            "impact": 100,
            "key": Object {
              "service.name": "opbeans-node",
              "transaction.name": "Process payment",
            },
            "transactionsPerMinute": 0.25,
          }
        `);

        expectSnapshot(groups).toMatchInline(`
          Array [
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "GET /throw-error",
            },
            Object {
              "service.name": "opbeans-java",
              "transaction.name": "APIRestController#orders",
            },
            Object {
              "service.name": "opbeans-java",
              "transaction.name": "APIRestController#order",
            },
            Object {
              "service.name": "opbeans-java",
              "transaction.name": "APIRestController#product",
            },
            Object {
              "service.name": "opbeans-node",
              "transaction.name": "GET /api/products/:id/customers",
            },
          ]
        `);
      });

      it('returns a sample', async () => {
        // sample should provide enough information to deeplink to a transaction detail page
        response.body.items.forEach((item: any) => {
          expect(item.sample.trace.id).to.be.an('string');
          expect(item.sample.transaction.id).to.be.an('string');
          expect(item.sample.service.name).to.be(item.key['service.name']);
          expect(item.sample.transaction.name).to.be(item.key['transaction.name']);
        });
      });
    });
  });
}
