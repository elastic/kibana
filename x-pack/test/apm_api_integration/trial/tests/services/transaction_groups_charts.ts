/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import { PromiseReturnType } from '../../../../../plugins/apm/typings/common';
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

  describe('APM Transaction Overview', () => {
    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('and fetching transaction groups charts with uiFilters', () => {
        const serviceName = 'opbeans-java';
        let response: PromiseReturnType<typeof supertest.get>;

        describe('without uiFilters', () => {
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/${serviceName}/transaction_groups/charts?start=${start}&end=${end}&transactionType=${transactionType}&`
            );
          });
          it('should return an error response', () => {
            expect(response.status).to.eql(400);
          });
        });

        describe('with empty uiFilters', () => {
          const uiFilters = encodeURIComponent(JSON.stringify({}));
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/${serviceName}/transaction_groups/charts?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}`
            );
          });

          it('should have a successful response', () => {
            expect(response.status).to.eql(200);
          });

          it('should include an ML job id', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries).to.have.property('jobId');
            expectSnapshot(response.body.anomalyTimeseries.jobId).toMatchInline(
              `"apm-environment_not_defined-7ed6-high_mean_transaction_duration"`
            );
          });

          it('should return the correct anomaly boundaries', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries).to.have.property('anomalyBoundaries');
            expect(response.body.anomalyTimeseries.anomalyBoundaries.length).to.equal(0);
          });
        });

        describe('with uiFilters environment defined', () => {
          const uiFilters = encodeURIComponent(JSON.stringify({ environment: 'production' }));
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/${serviceName}/transaction_groups/charts?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}`
            );
          });

          it('should have a successful response', () => {
            expect(response.status).to.eql(200);
          });

          it('should include an ML job id', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries).to.have.property('jobId');
            expectSnapshot(response.body.anomalyTimeseries.jobId).toMatchInline(
              `"apm-production-229a-high_mean_transaction_duration"`
            );
          });

          it('should return the correct anomaly boundaries', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries).to.have.property('anomalyBoundaries');
            expect(response.body.anomalyTimeseries.anomalyBoundaries.length).to.be.greaterThan(0);
            expectSnapshot(response.body.anomalyTimeseries.anomalyBoundaries).toMatch();
          });
        });

        describe('with uiFilters environment set to ENVIRONMENT_ALL', () => {
          const uiFilters = encodeURIComponent(JSON.stringify({ environment: 'ENVIRONMENT_ALL' }));
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/${serviceName}/transaction_groups/charts?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}`
            );
          });

          it('should have a successful response', () => {
            expect(response.status).to.eql(200);
          });

          it('should not include anomalyTimeseries', () => {
            expect(response.body).to.not.have.property('anomalyTimeseries');
          });
        });

        describe('with uiFilters with empty kuery and environment defined', () => {
          const uiFilters = encodeURIComponent(
            JSON.stringify({ kuery: '', environment: 'production' })
          );
          before(async () => {
            response = await supertest.get(
              `/api/apm/services/${serviceName}/transaction_groups/charts?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}`
            );
          });

          it('should have a successful response', () => {
            expect(response.status).to.eql(200);
          });

          it('should include an ML job id', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries).to.have.property('jobId');
            expectSnapshot(response.body.anomalyTimeseries.jobId).toMatchInline(
              `"apm-production-229a-high_mean_transaction_duration"`
            );
          });

          it('should return the correct anomaly boundaries', () => {
            expect(response.body).to.have.property('anomalyTimeseries');
            expect(response.body.anomalyTimeseries).to.have.property('anomalyBoundaries');
            expect(response.body.anomalyTimeseries.anomalyBoundaries.length).to.be.greaterThan(0);
            expectSnapshot(response.body.anomalyTimeseries.anomalyBoundaries).toMatch();
          });
        });
      });
    });
  });
}
