/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { PromiseReturnType } from '../../../../../plugins/observability/typings/common';
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
  const transactionType = 'request';

  describe('Latency', () => {
    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('and fetching transaction charts with uiFilters', () => {
        let response: PromiseReturnType<typeof supertest.get>;

        describe('without environment', () => {
          const uiFilters = encodeURIComponent(JSON.stringify({}));
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/opbeans-java/transactions/charts/latency?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
            );
          });
          it('should return an error response', () => {
            expect(response.status).to.eql(400);
          });
        });

        describe('without uiFilters', () => {
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/opbeans-java/transactions/charts/latency?start=${start}&end=${end}&transactionType=${transactionType}&latencyAggregationType=avg`
            );
          });
          it('should return an error response', () => {
            expect(response.status).to.eql(400);
          });
        });

        describe('with environment selected in uiFilters', () => {
          const uiFilters = encodeURIComponent(JSON.stringify({ environment: 'production' }));
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/opbeans-java/transactions/charts/latency?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
            );
          });

          it('should have a successful response', () => {
            expect(response.status).to.eql(200);
          });

          it('should only return ML results for the currently selected environment', () => {
            expect(response.body).to.have.property('anomalyTimeseries');

            expect(response.body.anomalyTimeseries.length).to.be(1);

            expect(response.body.anomalyTimeseries[0].job.id).to.be.a('string');
            expect(response.body.anomalyTimeseries[0].job.environment).to.be('production');

            expectSnapshot(response.body.anomalyTimeseries[0].job.id).toMatchInline(
              `"apm-production-1369-high_mean_transaction_duration"`
            );
          });

          it('should return a non-empty anomaly series', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries[0].anomalyBoundaries?.length).to.be.greaterThan(
              0
            );
            expectSnapshot(response.body.anomalyTimeseries[0].anomalyBoundaries).toMatch();
          });
        });

        describe('when not defined environments seleted', () => {
          const uiFilters = encodeURIComponent(
            JSON.stringify({ environment: 'ENVIRONMENT_NOT_DEFINED' })
          );
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/opbeans-python/transactions/charts/latency?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
            );
          });

          it('should have a successful response', () => {
            expect(response.status).to.eql(200);
          });

          it('should return the ML job id for anomalies with no defined environment', () => {
            expect(response.body).to.have.property('anomalyTimeseries');

            expect(response.body.anomalyTimeseries[0].job.environment).to.be(
              'ENVIRONMENT_NOT_DEFINED'
            );

            expectSnapshot(response.body.anomalyTimeseries[0].job.id).toMatchInline(
              `"apm-environment_not_defined-5626-high_mean_transaction_duration"`
            );
          });

          it('should return the correct anomaly boundaries', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expectSnapshot(response.body.anomalyTimeseries[0].anomalyBoundaries).toMatch();
          });
        });

        describe('with all environments selected', () => {
          const uiFilters = encodeURIComponent(JSON.stringify({ environment: 'ENVIRONMENT_ALL' }));
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/opbeans-java/transactions/charts/latency?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
            );
          });

          it('should have a successful response', () => {
            expect(response.status).to.eql(200);
          });

          it('should return anomaly data from all ML jobs', () => {
            expect(response.body.anomalyTimeseries.length).to.be.greaterThan(0);
            expectSnapshot(response.body.anomalyTimeseries.map((data: any) => data.job))
              .toMatchInline(`
              Array [
                Object {
                  "environment": "production",
                  "id": "apm-production-1369-high_mean_transaction_duration",
                },
              ]
            `);
          });
        });

        describe('with environment selected and empty kuery filter', () => {
          const uiFilters = encodeURIComponent(
            JSON.stringify({ kuery: '', environment: 'production' })
          );
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/opbeans-java/transactions/charts/latency?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
            );
          });

          it('should have a successful response', () => {
            expect(response.status).to.eql(200);
          });

          it('should return the ML job id for anomalies of the selected environment', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries[0].job.id).to.be.a('string');
            expect(response.body.anomalyTimeseries[0].job.environment).to.be('production');
            expectSnapshot(response.body.anomalyTimeseries[0].job.id).toMatchInline(
              `"apm-production-1369-high_mean_transaction_duration"`
            );
          });

          it('should return a non-empty anomaly series', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries[0].anomalyBoundaries?.length).to.be.greaterThan(
              0
            );
            expectSnapshot(response.body.anomalyTimeseries[0].anomalyBoundaries).toMatch();
          });
        });
      });
    });
  });
}
