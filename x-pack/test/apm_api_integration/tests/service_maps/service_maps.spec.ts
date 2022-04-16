/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, isEmpty, last, orderBy, uniq } from 'lodash';
import { ServiceConnectionNode } from '@kbn/apm-plugin/common/service_map';
import { ApmApiError, SupertestReturnType } from '../../common/apm_api_supertest';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type BackendResponse = SupertestReturnType<'GET /internal/apm/service-map/backend'>;
type ServiceNodeResponse =
  SupertestReturnType<'GET /internal/apm/service-map/service/{serviceName}'>;
type ServiceMapResponse = SupertestReturnType<'GET /internal/apm/service-map'>;

export default function serviceMapsApiTests({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  registry.when('Service map with a basic license', { config: 'basic', archives: [] }, () => {
    it('is only be available to users with Platinum license (or higher)', async () => {
      try {
        await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map`,
          params: {
            query: {
              start: metadata.start,
              end: metadata.end,
              environment: 'ENVIRONMENT_ALL',
            },
          },
        });

        expect(true).to.be(false);
      } catch (e) {
        const err = e as ApmApiError;
        expect(err.res.status).to.be(403);
        expectSnapshot(err.res.body.message).toMatchInline(
          `"In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data."`
        );
      }
    });
  });

  registry.when('Service map without data', { config: 'trial', archives: [] }, () => {
    describe('/internal/apm/service-map', () => {
      it('returns an empty list', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map`,
          params: {
            query: {
              start: metadata.start,
              end: metadata.end,
              environment: 'ENVIRONMENT_ALL',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.elements.length).to.be(0);
      });
    });

    describe('/internal/apm/service-map/service/{serviceName}', () => {
      let response: ServiceNodeResponse;
      before(async () => {
        response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map/service/{serviceName}`,
          params: {
            path: { serviceName: 'opbeans-node' },
            query: {
              start: metadata.start,
              end: metadata.end,
              environment: 'ENVIRONMENT_ALL',
            },
          },
        });
      });

      it('retuns status code 200', () => {
        expect(response.status).to.be(200);
      });

      it('returns an object with nulls', async () => {
        [
          response.body.currentPeriod?.failedTransactionsRate?.value,
          response.body.currentPeriod?.memoryUsage?.value,
          response.body.currentPeriod?.cpuUsage?.value,
          response.body.currentPeriod?.transactionStats?.latency?.value,
          response.body.currentPeriod?.transactionStats?.throughput?.value,
        ].forEach((value) => {
          expect(value).to.be.eql(null);
        });
      });
    });

    describe('/internal/apm/service-map/backend', () => {
      let response: BackendResponse;
      before(async () => {
        response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map/backend`,
          params: {
            query: {
              backendName: 'postgres',
              start: metadata.start,
              end: metadata.end,
              environment: 'ENVIRONMENT_ALL',
            },
          },
        });
      });

      it('retuns status code 200', () => {
        expect(response.status).to.be(200);
      });

      it('returns undefined values', () => {
        expect(response.body.currentPeriod).to.eql({ transactionStats: {} });
      });
    });
  });

  registry.when('Service Map with data', { config: 'trial', archives: ['apm_8.0.0'] }, () => {
    describe('/internal/apm/service-map', () => {
      let response: ServiceMapResponse;
      before(async () => {
        response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map`,
          params: {
            query: {
              environment: 'ENVIRONMENT_ALL',
              start: metadata.start,
              end: metadata.end,
            },
          },
        });
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
            response = await apmApiClient.readUser({
              endpoint: `GET /internal/apm/service-map`,
              params: {
                query: {
                  environment: 'ENVIRONMENT_ALL',
                  start: metadata.start,
                  end: metadata.end,
                },
              },
            });
          });
          it('returns service map elements with anomaly stats', () => {
            expect(response.status).to.be(200);
            const dataWithAnomalies = response.body.elements.filter(
              (el) => !isEmpty((el.data as ServiceConnectionNode).serviceAnomalyStats)
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
              (el) => !isEmpty((el.data as ServiceConnectionNode).serviceAnomalyStats)
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
            response = await apmApiClient.noMlAccessUser({
              endpoint: `GET /internal/apm/service-map`,
              params: {
                query: {
                  environment: 'ENVIRONMENT_ALL',
                  start: metadata.start,
                  end: metadata.end,
                },
              },
            });
          });
          it('returns service map elements without anomaly stats', () => {
            expect(response.status).to.be(200);
            const dataWithAnomalies = response.body.elements.filter(
              (el) => !isEmpty((el.data as ServiceConnectionNode).serviceAnomalyStats)
            );
            expect(dataWithAnomalies).to.be.empty();
          });
        });
      });

      describe('with a single service', () => {
        describe('when ENVIRONMENT_ALL is selected', () => {
          before(async () => {
            response = await apmApiClient.readUser({
              endpoint: `GET /internal/apm/service-map`,
              params: {
                query: {
                  environment: 'ENVIRONMENT_ALL',
                  start: metadata.start,
                  end: metadata.end,
                  serviceName: 'opbeans-java',
                },
              },
            });
          });

          it('retuns status code 200', () => {
            expect(response.status).to.be(200);
          });

          it('returns some elements', () => {
            expect(response.body.elements.length).to.be.greaterThan(1);
          });
        });
      });
    });

    describe('/internal/apm/service-map/service/{serviceName}', () => {
      let response: ServiceNodeResponse;
      before(async () => {
        response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map/service/{serviceName}`,
          params: {
            path: { serviceName: 'opbeans-node' },
            query: {
              start: metadata.start,
              end: metadata.end,
              environment: 'ENVIRONMENT_ALL',
            },
          },
        });
      });

      it('retuns status code 200', () => {
        expect(response.status).to.be(200);
      });

      it('returns some error rate', () => {
        expect(response.body.currentPeriod?.failedTransactionsRate?.value).to.eql(0);
        expect(
          response.body.currentPeriod?.failedTransactionsRate?.timeseries?.length
        ).to.be.greaterThan(0);
      });

      it('returns some latency', () => {
        expect(response.body.currentPeriod?.transactionStats?.latency?.value).to.be.greaterThan(0);
        expect(
          response.body.currentPeriod?.transactionStats?.latency?.timeseries?.length
        ).to.be.greaterThan(0);
      });

      it('returns some throughput', () => {
        expect(response.body.currentPeriod?.transactionStats?.throughput?.value).to.be.greaterThan(
          0
        );
        expect(
          response.body.currentPeriod?.transactionStats?.throughput?.timeseries?.length
        ).to.be.greaterThan(0);
      });

      it('returns some cpu usage', () => {
        expect(response.body.currentPeriod?.cpuUsage?.value).to.be.greaterThan(0);
        expect(response.body.currentPeriod?.cpuUsage?.timeseries?.length).to.be.greaterThan(0);
      });
    });

    describe('/internal/apm/service-map/backend', () => {
      let response: BackendResponse;
      before(async () => {
        response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/service-map/backend`,
          params: {
            query: {
              backendName: 'postgresql',
              start: metadata.start,
              end: metadata.end,
              environment: 'ENVIRONMENT_ALL',
            },
          },
        });
      });

      it('retuns status code 200', () => {
        expect(response.status).to.be(200);
      });

      it('returns some error rate', () => {
        expect(response.body.currentPeriod?.failedTransactionsRate?.value).to.eql(0);
        expect(
          response.body.currentPeriod?.failedTransactionsRate?.timeseries?.length
        ).to.be.greaterThan(0);
      });

      it('returns some latency', () => {
        expect(response.body.currentPeriod?.transactionStats?.latency?.value).to.be.greaterThan(0);
        expect(
          response.body.currentPeriod?.transactionStats?.latency?.timeseries?.length
        ).to.be.greaterThan(0);
      });

      it('returns some throughput', () => {
        expect(response.body.currentPeriod?.transactionStats?.throughput?.value).to.be.greaterThan(
          0
        );
        expect(
          response.body.currentPeriod?.transactionStats?.throughput?.timeseries?.length
        ).to.be.greaterThan(0);
      });
    });

    describe('With comparison', () => {
      describe('/internal/apm/service-map/backend', () => {
        let response: BackendResponse;
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/service-map/backend`,
            params: {
              query: {
                backendName: 'postgresql',
                start: metadata.start,
                end: metadata.end,
                environment: 'ENVIRONMENT_ALL',
                offset: '5m',
              },
            },
          });
        });

        it('returns some data', () => {
          const { currentPeriod, previousPeriod } = response.body;
          [
            currentPeriod.failedTransactionsRate,
            previousPeriod?.failedTransactionsRate,
            currentPeriod.transactionStats?.latency,
            previousPeriod?.transactionStats?.latency,
            currentPeriod.transactionStats?.throughput,
            previousPeriod?.transactionStats?.throughput,
          ].map((value) => expect(value?.timeseries?.length).to.be.greaterThan(0));
        });

        it('has same start time for both periods', () => {
          const { currentPeriod, previousPeriod } = response.body;
          expect(first(currentPeriod.failedTransactionsRate?.timeseries)?.x).to.equal(
            first(previousPeriod?.failedTransactionsRate?.timeseries)?.x
          );
        });

        it('has same end time for both periods', () => {
          const { currentPeriod, previousPeriod } = response.body;
          expect(last(currentPeriod.failedTransactionsRate?.timeseries)?.x).to.equal(
            last(previousPeriod?.failedTransactionsRate?.timeseries)?.x
          );
        });

        it('returns same number of buckets for both periods', () => {
          const { currentPeriod, previousPeriod } = response.body;
          expect(currentPeriod.failedTransactionsRate?.timeseries?.length).to.be(
            previousPeriod?.failedTransactionsRate?.timeseries?.length
          );
        });
      });

      describe('/internal/apm/service-map/service/{serviceName}', () => {
        let response: ServiceNodeResponse;
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/service-map/service/{serviceName}`,
            params: {
              path: { serviceName: 'opbeans-node' },
              query: {
                start: metadata.start,
                end: metadata.end,
                environment: 'ENVIRONMENT_ALL',
                offset: '5m',
              },
            },
          });
        });

        it('returns some data', () => {
          const { currentPeriod, previousPeriod } = response.body;
          [
            currentPeriod.failedTransactionsRate,
            previousPeriod?.failedTransactionsRate,
            currentPeriod.transactionStats?.latency,
            previousPeriod?.transactionStats?.latency,
            currentPeriod.transactionStats?.throughput,
            previousPeriod?.transactionStats?.throughput,
            currentPeriod.cpuUsage,
            previousPeriod?.cpuUsage,
            currentPeriod.memoryUsage,
            previousPeriod?.memoryUsage,
          ].map((value) => expect(value?.timeseries?.length).to.be.greaterThan(0));
        });

        it('has same start time for both periods', () => {
          const { currentPeriod, previousPeriod } = response.body;
          expect(first(currentPeriod.failedTransactionsRate?.timeseries)?.x).to.equal(
            first(previousPeriod?.failedTransactionsRate?.timeseries)?.x
          );
        });

        it('has same end time for both periods', () => {
          const { currentPeriod, previousPeriod } = response.body;
          expect(last(currentPeriod.failedTransactionsRate?.timeseries)?.x).to.equal(
            last(previousPeriod?.failedTransactionsRate?.timeseries)?.x
          );
        });

        it('returns same number of buckets for both periods', () => {
          const { currentPeriod, previousPeriod } = response.body;
          expect(currentPeriod.failedTransactionsRate?.timeseries?.length).to.be(
            previousPeriod?.failedTransactionsRate?.timeseries?.length
          );
        });
      });
    });
  });
}
