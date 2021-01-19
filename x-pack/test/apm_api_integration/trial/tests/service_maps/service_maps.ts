/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import expect from '@kbn/expect';
import { isEmpty, uniq } from 'lodash';
import archives_metadata from '../../../common/archives_metadata';
import { PromiseReturnType } from '../../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function serviceMapsApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestAsApmReadUserWithoutMlAccess = getService('supertestAsApmReadUserWithoutMlAccess');

  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);

  describe('Service Maps with a trial license', () => {
    describe('/api/apm/service-map', () => {
      describe('when there is no data', () => {
        it('returns empty list', async () => {
          const response = await supertest.get(`/api/apm/service-map?start=${start}&end=${end}`);

          expect(response.status).to.be(200);
          expect(response.body.elements.length).to.be(0);
        });
      });

      describe('when there is data', () => {
        before(() => esArchiver.load(archiveName));
        after(() => esArchiver.unload(archiveName));

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
              ">elasticsearch",
              ">feeds.elastic.co:443",
              ">postgresql",
              ">redis",
            ]
          `);

          expectSnapshot(elements).toMatch();
        });

        it('returns service map elements filtering by environment not defined', async () => {
          const ENVIRONMENT_NOT_DEFINED = 'ENVIRONMENT_NOT_DEFINED';
          const { body, status } = await supertest.get(
            `/api/apm/service-map?start=${start}&end=${end}&environment=${ENVIRONMENT_NOT_DEFINED}`
          );
          expect(status).to.be(200);
          const environments = new Set();
          body.elements.forEach((element: { data: Record<string, any> }) => {
            environments.add(element.data['service.environment']);
          });

          expect(environments.has(ENVIRONMENT_NOT_DEFINED)).to.eql(true);
          expectSnapshot(body).toMatch();
        });
      });
    });

    describe('/api/apm/service-map/service/{serviceName}', () => {
      describe('when there is no data', () => {
        it('returns an object with nulls', async () => {
          const q = querystring.stringify({
            start: metadata.start,
            end: metadata.end,
            uiFilters: encodeURIComponent('{}'),
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

    describe('when there is data with anomalies', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('with the default apm user', () => {
        let response: PromiseReturnType<typeof supertest.get>;

        before(async () => {
          response = await supertest.get(`/api/apm/service-map?start=${start}&end=${end}`);
        });

        it('returns service map elements with anomaly stats', () => {
          expect(response.status).to.be(200);
          const dataWithAnomalies = response.body.elements.filter(
            (el: { data: { serviceAnomalyStats?: {} } }) => !isEmpty(el.data.serviceAnomalyStats)
          );

          expect(dataWithAnomalies).to.not.empty();

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

          expectSnapshot(dataWithAnomalies.length).toMatchInline(`8`);
          expectSnapshot(dataWithAnomalies.slice(0, 3)).toMatchInline(`
            Array [
              Object {
                "data": Object {
                  "agent.name": "python",
                  "id": "opbeans-python",
                  "service.name": "opbeans-python",
                  "serviceAnomalyStats": Object {
                    "actualValue": 24282.2352941176,
                    "anomalyScore": 0,
                    "healthStatus": "healthy",
                    "jobId": "apm-environment_not_defined-5626-high_mean_transaction_duration",
                    "serviceName": "opbeans-python",
                    "transactionType": "request",
                  },
                },
              },
              Object {
                "data": Object {
                  "agent.name": "nodejs",
                  "id": "opbeans-node",
                  "service.environment": "testing",
                  "service.name": "opbeans-node",
                  "serviceAnomalyStats": Object {
                    "actualValue": 29300.5555555556,
                    "anomalyScore": 0,
                    "healthStatus": "healthy",
                    "jobId": "apm-testing-384f-high_mean_transaction_duration",
                    "serviceName": "opbeans-node",
                    "transactionType": "request",
                  },
                },
              },
              Object {
                "data": Object {
                  "agent.name": "rum-js",
                  "id": "opbeans-rum",
                  "service.environment": "testing",
                  "service.name": "opbeans-rum",
                  "serviceAnomalyStats": Object {
                    "actualValue": 2386500,
                    "anomalyScore": 0,
                    "healthStatus": "healthy",
                    "jobId": "apm-testing-384f-high_mean_transaction_duration",
                    "serviceName": "opbeans-rum",
                    "transactionType": "page-load",
                  },
                },
              },
            ]
          `);

          expectSnapshot(response.body).toMatch();
        });
      });

      describe('with a user that does not have access to ML', () => {
        let response: PromiseReturnType<typeof supertest.get>;

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
  });
}
