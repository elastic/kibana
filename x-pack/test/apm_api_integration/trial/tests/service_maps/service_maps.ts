/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import expect from '@kbn/expect';
import { isEmpty, uniq } from 'lodash';
import archives_metadata from '../../../common/archives_metadata';
import { PromiseReturnType } from '../../../../../plugins/apm/typings/common';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function serviceMapsApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
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
          );

          expectSnapshot(serviceNames).toMatchInline(`
            Array [
              "opbeans-rum",
              "opbeans-go",
              "opbeans-node",
              "opbeans-python",
              "opbeans-ruby",
              "opbeans-java",
              "opbeans-dotnet",
            ]
          `);

          const externalDestinations = uniq(
            elements
              .filter((element) => element.data.target?.startsWith('>'))
              .map((element) => element.data.target)
          );

          expectSnapshot(externalDestinations).toMatchInline(`
            Array [
              ">postgresql",
              ">elasticsearch",
              ">redis",
            ]
          `);

          expectSnapshot(elements).toMatch();
        });
      });
    });

    describe('/api/apm/service-map/service/{serviceName}', () => {
      describe('when there is no data', () => {
        it('returns an object with nulls', async () => {
          const q = querystring.stringify({
            start: metadata.start,
            end: metadata.end,
            uiFilters: {},
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

        expectSnapshot(dataWithAnomalies.length).toMatchInline(`1`);
        expectSnapshot(dataWithAnomalies.slice(0, 3)).toMatchInline(`
          Array [
            Object {
              "data": Object {
                "agent.name": "java",
                "id": "opbeans-java",
                "service.environment": "production",
                "service.name": "opbeans-java",
                "serviceAnomalyStats": Object {
                  "actualValue": 1707977.2499999995,
                  "anomalyScore": 0.12232533657975532,
                  "jobId": "apm-production-229a-high_mean_transaction_duration",
                  "transactionType": "request",
                },
              },
            },
          ]
        `);

        expectSnapshot(response.body).toMatch();
      });
    });
  });
}
