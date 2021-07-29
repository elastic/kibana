/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import querystring from 'querystring';
import url from 'url';
import expect from '@kbn/expect';
import { isEmpty, uniq } from 'lodash';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function serviceMapsApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestAsApmReadUserWithoutMlAccess = getService('supertestAsApmReadUserWithoutMlAccess');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);

  registry.when('Service map with a basic license', { config: 'basic', archives: [] }, () => {
    it('is only be available to users with Platinum license (or higher)', async () => {
      const response = await supertest.get(`/api/apm/service-map?start=${start}&end=${end}`);

      expect(response.status).to.be(403);

      expectSnapshot(response.body.message).toMatchInline(
        `"In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data."`
      );
    });
  });

  registry.when('Service map without data', { config: 'trial', archives: [] }, () => {
    describe('/api/apm/service-map', () => {
      it('returns an empty list', async () => {
        const response = await supertest.get(`/api/apm/service-map?start=${start}&end=${end}`);

        expect(response.status).to.be(200);
        expect(response.body.elements.length).to.be(0);
      });
    });

    describe('/api/apm/service-map/service/{serviceName}', () => {
      it('returns an object with nulls', async () => {
        const q = querystring.stringify({
          start: metadata.start,
          end: metadata.end,
        });
        const response = await supertest.get(`/api/apm/service-map/service/opbeans-node?${q}`);

        expect(response.status).to.be(200);

        expect(response.body.avgCpuUsage).to.be(null);
        expect(response.body.avgErrorRate).to.be(null);
        expect(response.body.avgMemoryUsage).to.be(null);
        expect(response.body.transactionStats.avgRequestsPerMinute).to.be(null);
        expect(response.body.transactionStats.avgTransactionDuration).to.be(null);
      });
    });
  });

  registry.when('Service Map with data', { config: 'trial', archives: ['apm_8.0.0'] }, () => {
    describe('/api/apm/service-map', () => {
      let response: PromiseReturnType<typeof supertest.get>;

      before(async () => {
        response = await supertest.get(`/api/apm/service-map?start=${start}&end=${end}`);
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

        const externalDestinations = uniq(
          elements
            .filter((element) => element.data.target?.startsWith('>'))
            .map((element) => element.data.target)
        ).sort();

        expectSnapshot(externalDestinations).toMatchInline(`
          Array [
            ">8b37cb7ca2ae49ada54db165f32d3a19.us-central1.gcp.foundit.no:9243",
            ">elasticsearch",
            ">epr-snapshot.elastic.co:443",
            ">feeds.elastic.co:443",
            ">postgresql",
            ">redis",
            ">sqlite",
          ]
        `);

        expectSnapshot(elements).toMatch();
      });

      describe('with ML data', () => {
        describe('with the default apm user', () => {
          before(async () => {
            response = await supertest.get(`/api/apm/service-map?start=${start}&end=${end}`);
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

            expectSnapshot(dataWithAnomalies.length).toMatchInline(`6`);
            expectSnapshot(dataWithAnomalies.slice(0, 3)).toMatchInline(`
              Array [
                Object {
                  "data": Object {
                    "agent.name": "nodejs",
                    "id": "kibana",
                    "service.environment": "production",
                    "service.name": "kibana",
                    "serviceAnomalyStats": Object {
                      "actualValue": 635652.26283725,
                      "anomalyScore": 0,
                      "healthStatus": "healthy",
                      "jobId": "apm-production-802c-high_mean_transaction_duration",
                      "serviceName": "kibana",
                      "transactionType": "request",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "agent.name": "ruby",
                    "id": "opbeans-ruby",
                    "service.environment": "production",
                    "service.name": "opbeans-ruby",
                    "serviceAnomalyStats": Object {
                      "actualValue": 24400.8867924528,
                      "anomalyScore": 0,
                      "healthStatus": "healthy",
                      "jobId": "apm-production-802c-high_mean_transaction_duration",
                      "serviceName": "opbeans-ruby",
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
                      "actualValue": 19105.8492063492,
                      "anomalyScore": 0,
                      "healthStatus": "healthy",
                      "jobId": "apm-production-802c-high_mean_transaction_duration",
                      "serviceName": "opbeans-java",
                      "transactionType": "request",
                    },
                  },
                },
              ]
            `);

            expectSnapshot(response.body).toMatch();
          });
        });

        describe('with a user that does not have access to ML', () => {
          before(async () => {
            response = await supertestAsApmReadUserWithoutMlAccess.get(
              `/api/apm/service-map?start=${start}&end=${end}`
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
                pathname: '/api/apm/service-map',
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
  });
}
