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
  const supertest = getService('legacySupertestAsApmReadUser');
  const supertestAsApmReadUserWithoutMlAccess = getService(
    'legacySupertestAsApmReadUserWithoutMlAccess'
  );

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
        const response = await supertest.get(
          `/internal/apm/services?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=`
        );

        expect(response.status).to.be(200);
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
        body: APIReturnType<'GET /internal/apm/services'>;
      };

      let sortedItems: typeof response.body.items;

      before(async () => {
        response = await supertest.get(
          `/internal/apm/services?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=`
        );
        sortedItems = sortBy(response.body.items, 'serviceName');
      });

      it('the response is successful', () => {
        expect(response.status).to.eql(200);
      });

      it('returns hasLegacyData: false', () => {
        expect(response.body.hasLegacyData).to.be(false);
      });

      it('returns the correct service names', () => {
        expectSnapshot(sortedItems.map((item) => item.serviceName)).toMatchInline(`
          Array [
            "auditbeat",
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
          sortedItems.map((item) => pick(item, 'transactionErrorRate', 'latency', 'throughput'))
        ).toMatchInline(`
          Array [
            Object {},
            Object {
              "latency": 496794.054441261,
              "throughput": 11.6333333333333,
              "transactionErrorRate": 0.0315186246418338,
            },
            Object {
              "latency": 83395.638576779,
              "throughput": 17.8,
              "transactionErrorRate": 0.00936329588014981,
            },
            Object {
              "latency": 430318.696035242,
              "throughput": 7.56666666666667,
              "transactionErrorRate": 0.092511013215859,
            },
            Object {
              "latency": 53147.5747663551,
              "throughput": 7.13333333333333,
              "transactionErrorRate": 0,
            },
            Object {
              "latency": 419826.24375,
              "throughput": 5.33333333333333,
              "transactionErrorRate": 0.025,
            },
            Object {
              "latency": 21520.4776632302,
              "throughput": 9.7,
              "transactionErrorRate": 0.00343642611683849,
            },
            Object {
              "latency": 1040388.88888889,
              "throughput": 2.4,
              "transactionErrorRate": null,
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

        expect(rumServices.every((item) => isEmpty(item.transactionErrorRate)));
      });

      it('non-RUM services all report transaction error rates', () => {
        const nonRumServices = sortedItems.filter(
          (item) => item.agentName !== 'rum-js' && item.serviceName !== 'auditbeat'
        );

        expect(
          nonRumServices.every((item) => {
            return typeof item.transactionErrorRate === 'number';
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
          body: APIReturnType<'GET /internal/apm/services'>;
        }

        const [unfilteredResponse, filteredResponse] = await Promise.all([
          supertest.get(
            `/internal/apm/services?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=`
          ) as Promise<Response>,
          supertest.get(
            `/internal/apm/services?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=${encodeURIComponent(
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
            body: APIReturnType<'GET /internal/apm/services'>;
          };

          before(async () => {
            response = await supertest.get(
              `/internal/apm/services?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=`
            );
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
                undefined,
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
            `/internal/apm/services?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=`
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
            `/internal/apm/services?environment=ENVIRONMENT_ALL&start=${start}&end=${end}&kuery=${encodeURIComponent(
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
