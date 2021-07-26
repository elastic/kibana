/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy, pick, isEmpty } from 'lodash';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestAsApmReadUserWithoutMlAccess = getService('supertestAsApmReadUserWithoutMlAccess');

  const archiveName = 'apm_8.0.0';

  const range = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(range.start);
  const end = encodeURIComponent(range.end);

  registry.when(
    'APM Services Overview with a basic license when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(`/api/apm/services?start=${start}&end=${end}`);

        expect(response.status).to.be(200);
        expect(response.body.hasHistoricalData).to.be(false);
        expect(response.body.hasLegacyData).to.be(false);
        expect(response.body.items.length).to.be(0);
      });
    }
  );

  registry.when(
    'APM Services Overview with a basic license when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /api/apm/services'>;
      };

      let sortedItems: typeof response.body.items;

      before(async () => {
        response = await supertest.get(`/api/apm/services?start=${start}&end=${end}`);
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
            "auditbeat",
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
            Object {},
            Object {
              "avgResponseTime": Object {
                "value": 665148.687971417,
              },
              "transactionErrorRate": Object {
                "value": 0.000396982929734021,
              },
              "transactionsPerMinute": Object {
                "value": 83.9666666666667,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 6717439,
              },
              "transactionErrorRate": Object {
                "value": null,
              },
              "transactionsPerMinute": Object {
                "value": 0.133333333333333,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 567780.581993569,
              },
              "transactionErrorRate": Object {
                "value": 0.022508038585209,
              },
              "transactionsPerMinute": Object {
                "value": 10.3666666666667,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 365743.034155598,
              },
              "transactionErrorRate": Object {
                "value": 0.0189753320683112,
              },
              "transactionsPerMinute": Object {
                "value": 17.5666666666667,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 508973.948096886,
              },
              "transactionErrorRate": Object {
                "value": 0.069204152249135,
              },
              "transactionsPerMinute": Object {
                "value": 9.63333333333333,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 53752.1063829787,
              },
              "transactionErrorRate": Object {
                "value": 0.0106382978723404,
              },
              "transactionsPerMinute": Object {
                "value": 6.26666666666667,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 45797.6478873239,
              },
              "transactionErrorRate": Object {
                "value": 0,
              },
              "transactionsPerMinute": Object {
                "value": 4.73333333333333,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 98468.4339622642,
              },
              "transactionErrorRate": Object {
                "value": 0,
              },
              "transactionsPerMinute": Object {
                "value": 10.6,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 1260213.23728814,
              },
              "transactionErrorRate": Object {
                "value": null,
              },
              "transactionsPerMinute": Object {
                "value": 1.96666666666667,
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

        const rumServices = sortedItems.filter((item) => item.agentName === 'rum-js');

        expect(rumServices.length).to.be.greaterThan(0);

        expect(rumServices.every((item) => isEmpty(item.transactionErrorRate?.value)));
      });

      it('non-RUM services all report transaction error rates', () => {
        const nonRumServices = sortedItems.filter(
          (item) => item.agentName !== 'rum-js' && item.serviceName !== 'auditbeat'
        );

        expect(
          nonRumServices.every((item) => {
            return (
              typeof item.transactionErrorRate?.value === 'number' &&
              item.transactionErrorRate.timeseries.length > 0
            );
          })
        ).to.be(true);
      });
    }
  );

  registry.when(
    'APM Services Overview with a basic license when data is loaded excluding transaction events',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('includes services that only report metric data', async () => {
        interface Response {
          status: number;
          body: APIReturnType<'GET /api/apm/services'>;
        }

        const [unfilteredResponse, filteredResponse] = await Promise.all([
          supertest.get(`/api/apm/services?start=${start}&end=${end}`) as Promise<Response>,
          supertest.get(
            `/api/apm/services?start=${start}&end=${end}&kuery=${encodeURIComponent(
              'not (processor.event:transaction)'
            )}`
          ) as Promise<Response>,
        ]);

        expect(unfilteredResponse.body.items.length).to.be.greaterThan(0);

        const unfilteredServiceNames = unfilteredResponse.body.items
          .map((item) => item.serviceName)
          .sort();

        const filteredServiceNames = filteredResponse.body.items
          .map((item) => item.serviceName)
          .sort();

        expect(unfilteredServiceNames).to.eql(filteredServiceNames);

        expect(filteredResponse.body.items.every((item) => !!item.agentName)).to.be(true);
      });
    }
  );

  registry.when(
    'APM Services overview with a trial license when data is loaded',
    { config: 'trial', archives: [archiveName] },
    () => {
      describe('with the default APM read user', () => {
        describe('and fetching a list of services', () => {
          let response: {
            status: number;
            body: APIReturnType<'GET /api/apm/services'>;
          };

          before(async () => {
            response = await supertest.get(`/api/apm/services?start=${start}&end=${end}`);
          });

          it('the response is successful', () => {
            expect(response.status).to.eql(200);
          });

          it('there is at least one service', () => {
            expect(response.body.items.length).to.be.greaterThan(0);
          });

          it('some items have a health status set', () => {
            // Under the assumption that the loaded archive has
            // at least one APM ML job, and the time range is longer
            // than 15m, at least one items should have a health status
            // set. Note that we currently have a bug where healthy
            // services report as unknown (so without any health status):
            // https://github.com/elastic/kibana/issues/77083

            const healthStatuses = sortBy(response.body.items, 'serviceName').map(
              (item: any) => item.healthStatus
            );

            expect(healthStatuses.filter(Boolean).length).to.be.greaterThan(0);

            expectSnapshot(healthStatuses).toMatchInline(`
                          Array [
                            "healthy",
                            "healthy",
                            "healthy",
                            "healthy",
                            "healthy",
                            "healthy",
                            "healthy",
                            "healthy",
                            "healthy",
                          ]
                      `);
          });
        });
      });

      describe('with a user that does not have access to ML', () => {
        let response: PromiseReturnType<typeof supertest.get>;
        before(async () => {
          response = await supertestAsApmReadUserWithoutMlAccess.get(
            `/api/apm/services?start=${start}&end=${end}`
          );
        });

        it('the response is successful', () => {
          expect(response.status).to.eql(200);
        });

        it('there is at least one service', () => {
          expect(response.body.items.length).to.be.greaterThan(0);
        });

        it('contains no health statuses', () => {
          const definedHealthStatuses = response.body.items
            .map((item: any) => item.healthStatus)
            .filter(Boolean);

          expect(definedHealthStatuses.length).to.be(0);
        });
      });

      describe('and fetching a list of services with a filter', () => {
        let response: PromiseReturnType<typeof supertest.get>;
        before(async () => {
          response = await supertest.get(
            `/api/apm/services?environment=ENVIRONMENT_ALL&start=${start}&end=${end}&kuery=${encodeURIComponent(
              'service.name:opbeans-java'
            )}`
          );
        });

        it('does not return health statuses for services that are not found in APM data', () => {
          expect(response.status).to.be(200);

          expect(response.body.items.length).to.be(1);

          expect(response.body.items[0].serviceName).to.be('opbeans-java');
        });
      });
    }
  );
}
