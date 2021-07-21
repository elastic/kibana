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
                "value": 421616.337243402,
              },
              "transactionErrorRate": Object {
                "value": 0,
              },
              "transactionsPerMinute": Object {
                "value": 25.2,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 2387606.33333333,
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
                "value": 633386.908045977,
              },
              "transactionErrorRate": Object {
                "value": 0.027027027027027,
              },
              "transactionsPerMinute": Object {
                "value": 2.46666666666667,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 27891.1507936508,
              },
              "transactionErrorRate": Object {
                "value": 0.0186915887850467,
              },
              "transactionsPerMinute": Object {
                "value": 3.56666666666667,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 237995.266666667,
              },
              "transactionErrorRate": Object {
                "value": 0.159420289855072,
              },
              "transactionsPerMinute": Object {
                "value": 2.3,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 24989.3157894737,
              },
              "transactionErrorRate": Object {
                "value": 0.0263157894736842,
              },
              "transactionsPerMinute": Object {
                "value": 2.53333333333333,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 29161.3703703704,
              },
              "transactionErrorRate": Object {
                "value": 0.0392156862745098,
              },
              "transactionsPerMinute": Object {
                "value": 1.7,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 71576.4545454545,
              },
              "transactionErrorRate": Object {
                "value": 0.0454545454545455,
              },
              "transactionsPerMinute": Object {
                "value": 3.66666666666667,
              },
            },
            Object {
              "avgResponseTime": Object {
                "value": 2324991,
              },
              "transactionErrorRate": Object {
                "value": null,
              },
              "transactionsPerMinute": Object {
                "value": 0.5,
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
