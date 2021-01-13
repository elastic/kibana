/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isEmpty, pick, sortBy } from 'lodash';
import { APIReturnType } from '../../../../../plugins/apm/public/services/rest/createCallApmApi';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import archives_metadata from '../../../common/fixtures/es_archiver/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';

  const range = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(range.start);
  const end = encodeURIComponent(range.end);

  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('APM Services Overview', () => {
    describe('when data is not loaded ', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expect(response.body.hasHistoricalData).to.be(false);
        expect(response.body.hasLegacyData).to.be(false);
        expect(response.body.items.length).to.be(0);
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('and fetching a list of services', () => {
        let response: {
          status: number;
          body: APIReturnType<'GET /api/apm/services'>;
        };

        let sortedItems: typeof response.body.items;

        before(async () => {
          response = await supertest.get(
            `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
          );
          sortedItems = sortBy(response.body.items, 'serviceName');
        });

        it('the response is successful', () => {
          expect(response.status).to.eql(200);
        });

        it('returns hasHistoricalData: true', () => {
          expect(response.body.hasHistoricalData).to.be(true);
        });

        it('returns hasLegacyData: false', () => {
          expect(response.body.hasLegacyData).to.be(false);
        });

        it('returns the correct service names', () => {
          expectSnapshot(sortedItems.map((item) => item.serviceName)).toMatchInline(`
            Array [
              "kibana",
              "kibana-frontend",
              "opbeans-dotnet",
              "opbeans-go",
              "opbeans-java",
              "opbeans-node",
              "opbeans-python",
              "opbeans-ruby",
              "opbeans-rum",
            ]
          `);
        });

        it('returns the correct metrics averages', () => {
          expectSnapshot(
            sortedItems.map((item) =>
              pick(
                item,
                'transactionErrorRate.value',
                'avgResponseTime.value',
                'transactionsPerMinute.value'
              )
            )
          ).toMatchInline(`
            Array [
              Object {
                "avgResponseTime": Object {
                  "value": 420419.34550767,
                },
                "transactionErrorRate": Object {
                  "value": 0,
                },
                "transactionsPerMinute": Object {
                  "value": 45.6333333333333,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 2382833.33333333,
                },
                "transactionErrorRate": Object {
                  "value": null,
                },
                "transactionsPerMinute": Object {
                  "value": 0.2,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 631521.83908046,
                },
                "transactionErrorRate": Object {
                  "value": 0.0229885057471264,
                },
                "transactionsPerMinute": Object {
                  "value": 2.9,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 27946.1484375,
                },
                "transactionErrorRate": Object {
                  "value": 0.015625,
                },
                "transactionsPerMinute": Object {
                  "value": 4.26666666666667,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 237339.813333333,
                },
                "transactionErrorRate": Object {
                  "value": 0.16,
                },
                "transactionsPerMinute": Object {
                  "value": 2.5,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 24920.1052631579,
                },
                "transactionErrorRate": Object {
                  "value": 0.0210526315789474,
                },
                "transactionsPerMinute": Object {
                  "value": 3.16666666666667,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 29542.6607142857,
                },
                "transactionErrorRate": Object {
                  "value": 0.0357142857142857,
                },
                "transactionsPerMinute": Object {
                  "value": 1.86666666666667,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 70518.9328358209,
                },
                "transactionErrorRate": Object {
                  "value": 0.0373134328358209,
                },
                "transactionsPerMinute": Object {
                  "value": 4.46666666666667,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 2319812.5,
                },
                "transactionErrorRate": Object {
                  "value": null,
                },
                "transactionsPerMinute": Object {
                  "value": 0.533333333333333,
                },
              },
            ]
          `);
        });

        it('returns environments', () => {
          expectSnapshot(sortedItems.map((item) => item.environments ?? [])).toMatchInline(`
            Array [
              Array [
                "production",
              ],
              Array [
                "production",
              ],
              Array [
                "production",
              ],
              Array [
                "testing",
              ],
              Array [
                "production",
              ],
              Array [
                "testing",
              ],
              Array [],
              Array [],
              Array [
                "testing",
              ],
            ]
          `);
        });

        it(`RUM services don't report any transaction error rates`, () => {
          // RUM transactions don't have event.outcome set,
          // so they should not have an error rate

          const rumServices = sortedItems.filter((item) => item.agentName === 'rum-js');

          expect(rumServices.length).to.be.greaterThan(0);

          expect(rumServices.every((item) => isEmpty(item.transactionErrorRate?.value)));
        });

        it('non-RUM services all report transaction error rates', () => {
          const nonRumServices = sortedItems.filter((item) => item.agentName !== 'rum-js');

          expect(
            nonRumServices.every((item) => {
              return (
                typeof item.transactionErrorRate?.value === 'number' &&
                item.transactionErrorRate.timeseries.length > 0
              );
            })
          ).to.be(true);
        });
      });
    });
  });
}
