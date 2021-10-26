/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import querystring from 'querystring';
import url from 'url';
import expect from '@kbn/expect';
import { isEmpty, orderBy, uniq } from 'lodash';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function serviceMapsApiTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');
  const supertestAsApmReadUserWithoutMlAccess = getService(
    'legacySupertestAsApmReadUserWithoutMlAccess'
  );

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);

  registry.when('Service map with a basic license', { config: 'basic', archives: [] }, () => {
    it('is only be available to users with Platinum license (or higher)', async () => {
      const response = await supertest.get(
        `/internal/apm/service-map?start=${start}&end=${end}&environment=ENVIRONMENT_ALL`
      );

      expect(response.status).to.be(403);

      expectSnapshot(response.body.message).toMatchInline(
        `"In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data."`
      );
    });
  });

  registry.when('Service map without data', { config: 'trial', archives: [] }, () => {
    describe('/internal/apm/service-map', () => {
      it('returns an empty list', async () => {
        const response = await supertest.get(
          `/internal/apm/service-map?start=${start}&end=${end}&environment=ENVIRONMENT_ALL`
        );

        expect(response.status).to.be(200);
        expect(response.body.elements.length).to.be(0);
      });
    });

    describe('/internal/apm/service-map/service/{serviceName}', () => {
      it('returns an object with nulls', async () => {
        const q = querystring.stringify({
          start: metadata.start,
          end: metadata.end,
          environment: 'ENVIRONMENT_ALL',
        });
        const response = await supertest.get(`/internal/apm/service-map/service/opbeans-node?${q}`);

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "avgCpuUsage": null,
            "avgErrorRate": null,
            "avgMemoryUsage": null,
            "transactionStats": Object {
              "avgRequestsPerMinute": null,
              "avgTransactionDuration": null,
            },
          }
        `);
      });
    });

    describe('/internal/apm/service-map/backend', () => {
      it('returns an object with nulls', async () => {
        const q = querystring.stringify({
          backendName: 'postgres',
          start: metadata.start,
          end: metadata.end,
          environment: 'ENVIRONMENT_ALL',
        });
        const response = await supertest.get(`/internal/apm/service-map/backend?${q}`);

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "avgErrorRate": null,
            "transactionStats": Object {
              "avgRequestsPerMinute": null,
              "avgTransactionDuration": null,
            },
          }
        `);
      });
    });
  });

  registry.when('Service Map with data', { config: 'trial', archives: ['apm_8.0.0'] }, () => {
    describe('/internal/apm/service-map', () => {
      let response: PromiseReturnType<typeof supertest.get>;

      before(async () => {
        response = await supertest.get(
          `/internal/apm/service-map?start=${start}&end=${end}&environment=ENVIRONMENT_ALL`
        );
      });

      it('returns service map elements', () => {
        expect(response.status).to.be(200);
        expect(response.body.elements.length).to.be.greaterThan(0);
      });

      it('returns the correct data', () => {
        const elements: Array<{ data: Record<string, any> }> = response.body.elements;

        const serviceNames = uniq(
          elements
            .filter((element) => element.data['service.name'] !== undefined)
            .map((element) => element.data['service.name'])
        ).sort();

        expectSnapshot(serviceNames).toMatchInline(`
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

        const externalDestinations = uniq(
          elements
            .filter((element) => element.data.target?.startsWith('>'))
            .map((element) => element.data.target)
        ).sort();

        expectSnapshot(externalDestinations).toMatchInline(`
          Array [
            ">elasticsearch",
            ">postgresql",
            ">redis",
            ">sqlite",
          ]
        `);
      });

      describe('with ML data', () => {
        describe('with the default apm user', () => {
          before(async () => {
            response = await supertest.get(
              `/internal/apm/service-map?start=${start}&end=${end}&environment=ENVIRONMENT_ALL`
            );
          });

          it('returns service map elements with anomaly stats', () => {
            expect(response.status).to.be(200);
            const dataWithAnomalies = response.body.elements.filter(
              (el: { data: { serviceAnomalyStats?: {} } }) => !isEmpty(el.data.serviceAnomalyStats)
            );

            expect(dataWithAnomalies).not.to.be.empty();

            dataWithAnomalies.forEach(({ data }: any) => {
              expect(
                Object.values(data.serviceAnomalyStats).filter((value) => isEmpty(value))
              ).to.not.empty();
            });
          });

          it('returns the correct anomaly stats', () => {
            const dataWithAnomalies = response.body.elements.filter(
              (el: { data: { serviceAnomalyStats?: {} } }) => !isEmpty(el.data.serviceAnomalyStats)
            );

            expect(dataWithAnomalies).not.to.be.empty();

            expectSnapshot(dataWithAnomalies.length).toMatchInline(`7`);
            expectSnapshot(orderBy(dataWithAnomalies, 'data.id').slice(0, 3)).toMatchInline(`
              Array [
                Object {
                  "data": Object {
                    "agent.name": "dotnet",
                    "id": "opbeans-dotnet",
                    "service.environment": "production",
                    "service.name": "opbeans-dotnet",
                    "serviceAnomalyStats": Object {
                      "actualValue": 868025.86875,
                      "anomalyScore": 0,
                      "healthStatus": "healthy",
                      "jobId": "apm-production-6117-high_mean_transaction_duration",
                      "serviceName": "opbeans-dotnet",
                      "transactionType": "request",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "agent.name": "go",
                    "id": "opbeans-go",
                    "service.environment": "testing",
                    "service.name": "opbeans-go",
                    "serviceAnomalyStats": Object {
                      "actualValue": 102786.319148936,
                      "anomalyScore": 0,
                      "healthStatus": "healthy",
                      "jobId": "apm-testing-41e5-high_mean_transaction_duration",
                      "serviceName": "opbeans-go",
                      "transactionType": "request",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "agent.name": "java",
                    "id": "opbeans-java",
                    "service.environment": "production",
                    "service.name": "opbeans-java",
                    "serviceAnomalyStats": Object {
                      "actualValue": 175568.855769231,
                      "anomalyScore": 0,
                      "healthStatus": "healthy",
                      "jobId": "apm-production-6117-high_mean_transaction_duration",
                      "serviceName": "opbeans-java",
                      "transactionType": "request",
                    },
                  },
                },
              ]
            `);
          });
        });

        describe('with a user that does not have access to ML', () => {
          before(async () => {
            response = await supertestAsApmReadUserWithoutMlAccess.get(
              `/internal/apm/service-map?start=${start}&end=${end}&environment=ENVIRONMENT_ALL`
            );
          });

          it('returns service map elements without anomaly stats', () => {
            expect(response.status).to.be(200);

            const dataWithAnomalies = response.body.elements.filter(
              (el: { data: { serviceAnomalyStats?: {} } }) => !isEmpty(el.data.serviceAnomalyStats)
            );

            expect(dataWithAnomalies).to.be.empty();
          });
        });
      });

      describe('with a single service', () => {
        describe('when ENVIRONMENT_ALL is selected', () => {
          it('returns service map elements', async () => {
            response = await supertest.get(
              url.format({
                pathname: '/internal/apm/service-map',
                query: {
                  environment: 'ENVIRONMENT_ALL',
                  start: metadata.start,
                  end: metadata.end,
                  serviceName: 'opbeans-java',
                },
              })
            );

            expect(response.status).to.be(200);
            expect(response.body.elements.length).to.be.greaterThan(1);
          });
        });
      });
    });

    describe('/internal/apm/service-map/service/{serviceName}', () => {
      it('returns an object with data', async () => {
        const q = querystring.stringify({
          start: metadata.start,
          end: metadata.end,
          environment: 'ENVIRONMENT_ALL',
        });
        const response = await supertest.get(`/internal/apm/service-map/service/opbeans-node?${q}`);

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "avgCpuUsage": 0.240216666666667,
            "avgErrorRate": 0,
            "avgMemoryUsage": 0.202572668763642,
            "transactionStats": Object {
              "avgRequestsPerMinute": 7.13333333333333,
              "avgTransactionDuration": 53147.5747663551,
            },
          }
        `);
      });
    });

    describe('/internal/apm/service-map/backend', () => {
      it('returns an object with data', async () => {
        const q = querystring.stringify({
          backendName: 'postgresql',
          start: metadata.start,
          end: metadata.end,
          environment: 'ENVIRONMENT_ALL',
        });
        const response = await supertest.get(`/internal/apm/service-map/backend?${q}`);

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "avgErrorRate": 0,
            "transactionStats": Object {
              "avgRequestsPerMinute": 82.9666666666667,
              "avgTransactionDuration": 18307.583366814,
            },
          }
        `);
      });
    });
  });
}
