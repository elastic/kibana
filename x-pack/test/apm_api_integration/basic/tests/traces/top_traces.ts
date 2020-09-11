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
      it('handles empty state', async function () {
        const response = await supertest.get(
          `/api/apm/traces?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatch();
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
        expect(response.body.items.length).to.be(33);
      });

      it('returns the correct buckets', async () => {
        const responseWithoutSamples = sortBy(
          response.body.items.map((item: any) => omit(item, 'sample')),
          'impact'
        );

        expectSnapshot(responseWithoutSamples).toMatchInline(`
          Array [
            Object {
              "averageResponseTime": 2577,
              "impact": 0,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /throw-error",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 3147,
              "impact": 0.06552270160444405,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#orders",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 3392.5,
              "impact": 0.09374344413758617,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#order",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 4713.5,
              "impact": 0.24559517890858723,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#product",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 4757,
              "impact": 0.25059559560997896,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/products/:id/customers",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 6787,
              "impact": 0.4839483750082622,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#products",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 4749.666666666667,
              "impact": 0.5227447114845778,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/orders/:id",
              },
              "transactionsPerMinute": 0.75,
            },
            Object {
              "averageResponseTime": 7624.5,
              "impact": 0.5802207655235637,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/orders",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 5098,
              "impact": 0.582807187955318,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/stats",
              },
              "transactionsPerMinute": 0.75,
            },
            Object {
              "averageResponseTime": 8181,
              "impact": 0.6441916136689552,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/types/:id",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 20011,
              "impact": 0.853921734857215,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "POST /api",
              },
              "transactionsPerMinute": 0.25,
            },
            Object {
              "averageResponseTime": 6583,
              "impact": 1.2172278724376455,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/products",
              },
              "transactionsPerMinute": 1,
            },
            Object {
              "averageResponseTime": 33097,
              "impact": 1.6060533780113861,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/products/top",
              },
              "transactionsPerMinute": 0.25,
            },
            Object {
              "averageResponseTime": 4825,
              "impact": 1.6450221426498186,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#topProducts",
              },
              "transactionsPerMinute": 1.75,
            },
            Object {
              "averageResponseTime": 35846,
              "impact": 1.7640550505645587,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /log-error",
              },
              "transactionsPerMinute": 0.25,
            },
            Object {
              "averageResponseTime": 3742.153846153846,
              "impact": 2.4998634943716573,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#customerWhoBought",
              },
              "transactionsPerMinute": 3.25,
            },
            Object {
              "averageResponseTime": 3492.9285714285716,
              "impact": 2.5144049360435208,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET static file",
              },
              "transactionsPerMinute": 3.5,
            },
            Object {
              "averageResponseTime": 26992.5,
              "impact": 2.8066131947777255,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/types",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 13516.5,
              "impact": 2.8112687551548836,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/products/:id",
              },
              "transactionsPerMinute": 1,
            },
            Object {
              "averageResponseTime": 20092,
              "impact": 3.168195050736987,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api/customers",
              },
              "transactionsPerMinute": 0.75,
            },
            Object {
              "averageResponseTime": 15535,
              "impact": 3.275330415465657,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#stats",
              },
              "transactionsPerMinute": 1,
            },
            Object {
              "averageResponseTime": 32667.5,
              "impact": 3.458966408120217,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /log-message",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 16690.75,
              "impact": 3.541042213287889,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#customers",
              },
              "transactionsPerMinute": 1,
            },
            Object {
              "averageResponseTime": 33500,
              "impact": 3.5546640380951287,
              "key": Object {
                "service.name": "client",
                "transaction.name": "/customers",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 77000,
              "impact": 4.129424578484989,
              "key": Object {
                "service.name": "client",
                "transaction.name": "/products",
              },
              "transactionsPerMinute": 0.25,
            },
            Object {
              "averageResponseTime": 19370.6,
              "impact": 5.270496679320978,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "APIRestController#customer",
              },
              "transactionsPerMinute": 1.25,
            },
            Object {
              "averageResponseTime": 81500,
              "impact": 9.072365225837785,
              "key": Object {
                "service.name": "client",
                "transaction.name": "/orders",
              },
              "transactionsPerMinute": 0.5,
            },
            Object {
              "averageResponseTime": 14419.42857142857,
              "impact": 11.30657439844125,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "ResourceHttpRequestHandler",
              },
              "transactionsPerMinute": 3.5,
            },
            Object {
              "averageResponseTime": 270684,
              "impact": 15.261616628971955,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "POST /api/orders",
              },
              "transactionsPerMinute": 0.25,
            },
            Object {
              "averageResponseTime": 36010.53846153846,
              "impact": 26.61043592713186,
              "key": Object {
                "service.name": "opbeans-java",
                "transaction.name": "DispatcherServlet#doGet",
              },
              "transactionsPerMinute": 3.25,
            },
            Object {
              "averageResponseTime": 208000,
              "impact": 35.56882613781033,
              "key": Object {
                "service.name": "client",
                "transaction.name": "/dashboard",
              },
              "transactionsPerMinute": 0.75,
            },
            Object {
              "averageResponseTime": 49816.15625,
              "impact": 91.32732325394932,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "GET /api",
              },
              "transactionsPerMinute": 8,
            },
            Object {
              "averageResponseTime": 1745009,
              "impact": 100,
              "key": Object {
                "service.name": "opbeans-node",
                "transaction.name": "Process payment",
              },
              "transactionsPerMinute": 0.25,
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
