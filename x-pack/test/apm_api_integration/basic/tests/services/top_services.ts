/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isEmpty, pick } from 'lodash';
import { PromiseReturnType } from '../../../../../plugins/apm/typings/common';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import archives_metadata from '../../../common/archives_metadata';

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
        let response: PromiseReturnType<typeof supertest.get>;
        before(async () => {
          response = await supertest.get(
            `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
          );
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
          expectSnapshot(response.body.items.map((item: any) => item.serviceName)).toMatchInline(`
            Array [
              "opbeans-python",
              "opbeans-node",
              "opbeans-go",
              "opbeans-ruby",
              "opbeans-dotnet",
              "opbeans-java",
              "opbeans-rum",
            ]
          `);
        });

        it('returns the correct metrics averages', () => {
          expectSnapshot(
            response.body.items.map((item: any) =>
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
                  "value": 213583.7652495379,
                },
                "transactionErrorRate": Object {
                  "value": 0,
                },
                "transactionsPerMinute": Object {
                  "value": 18.033333333333335,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 600255.7079646018,
                },
                "transactionErrorRate": Object {
                  "value": 0,
                },
                "transactionsPerMinute": Object {
                  "value": 7.533333333333333,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 1818501.060810811,
                },
                "transactionErrorRate": Object {
                  "value": 0.02027027027027027,
                },
                "transactionsPerMinute": Object {
                  "value": 4.933333333333334,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 290900.5714285714,
                },
                "transactionErrorRate": Object {
                  "value": 0.013605442176870748,
                },
                "transactionsPerMinute": Object {
                  "value": 4.9,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 1123903.7027027027,
                },
                "transactionErrorRate": Object {
                  "value": 0.009009009009009009,
                },
                "transactionsPerMinute": Object {
                  "value": 3.7,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 80364.62962962964,
                },
                "transactionErrorRate": Object {
                  "value": 0.18518518518518517,
                },
                "transactionsPerMinute": Object {
                  "value": 3.6,
                },
              },
              Object {
                "avgResponseTime": Object {
                  "value": 1365102.9411764706,
                },
                "transactionsPerMinute": Object {
                  "value": 2.2666666666666666,
                },
              },
            ]
          `);
        });

        it('returns environments', () => {
          expectSnapshot(response.body.items.map((item: any) => item.environments ?? []))
            .toMatchInline(`
            Array [
              Array [
                "production",
              ],
              Array [
                "testing",
              ],
              Array [
                "testing",
              ],
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
            ]
          `);
        });

        it(`RUM services don't report any transaction error rates`, () => {
          // RUM transactions don't have event.outcome set,
          // so they should not have an error rate

          const rumServices = response.body.items.filter(
            (item: any) => item.agentName === 'rum-js'
          );

          expect(rumServices.length).to.be.greaterThan(0);

          expect(rumServices.every((item: any) => isEmpty(item.transactionErrorRate?.value)));
        });

        it('non-RUM services all report transaction error rates', () => {
          const nonRumServices = response.body.items.filter(
            (item: any) => item.agentName !== 'rum-js'
          );

          expect(
            nonRumServices.every((item: any) => {
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
