/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';

  const range = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(range.start);
  const end = encodeURIComponent(range.end);

  registry.when(
    'Latency with a basic license when data is not loaded ',
    { config: 'basic', archives: [] },
    () => {
      const uiFilters = encodeURIComponent(JSON.stringify({}));
      it('returns 400 when latencyAggregationType is not informed', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transactions/charts/latency?environment=testing&start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=request`
        );

        expect(response.status).to.be(400);
      });

      it('returns 400 when transactionType is not informed', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transactions/charts/latency?environment=testing&start=${start}&end=${end}&uiFilters=${uiFilters}&latencyAggregationType=avg`
        );

        expect(response.status).to.be(400);
      });

      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transactions/charts/latency?environment=testing&start=${start}&end=${end}&uiFilters=${uiFilters}&latencyAggregationType=avg&transactionType=request`
        );

        expect(response.status).to.be(200);

        expect(response.body.overallAvgDuration).to.be(null);
        expect(response.body.latencyTimeseries.length).to.be(0);
      });
    }
  );

  registry.when(
    'Latency with a basic license when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: PromiseReturnType<typeof supertest.get>;

      const uiFilters = encodeURIComponent(JSON.stringify({}));

      describe('average latency type', () => {
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-node/transactions/charts/latency?environment=testing&start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=request&latencyAggregationType=avg`
          );
        });

        it('returns average duration and timeseries', async () => {
          expect(response.status).to.be(200);
          expect(response.body.overallAvgDuration).not.to.be(null);
          expect(response.body.latencyTimeseries.length).to.be.eql(61);
        });
      });

      describe('95th percentile latency type', () => {
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-node/transactions/charts/latency?environment=testing&start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=request&latencyAggregationType=p95`
          );
        });

        it('returns average duration and timeseries', async () => {
          expect(response.status).to.be(200);
          expect(response.body.overallAvgDuration).not.to.be(null);
          expect(response.body.latencyTimeseries.length).to.be.eql(61);
        });
      });

      describe('99th percentile latency type', () => {
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-node/transactions/charts/latency?environment=testing&start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=request&latencyAggregationType=p99`
          );
        });

        it('returns average duration and timeseries', async () => {
          expect(response.status).to.be(200);
          expect(response.body.overallAvgDuration).not.to.be(null);
          expect(response.body.latencyTimeseries.length).to.be.eql(61);
        });
      });
    }
  );

  registry.when(
    'Transaction latency with a trial license when data is loaded',
    { config: 'trial', archives: [archiveName] },
    () => {
      let response: PromiseReturnType<typeof supertest.get>;

      const transactionType = 'request';

      describe('without an environment', () => {
        const uiFilters = encodeURIComponent(JSON.stringify({}));
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-java/transactions/charts/latency?start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
          );
        });

        it('returns an ok response', () => {
          expect(response.status).to.eql(200);
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

      describe('with environment selected', () => {
        const uiFilters = encodeURIComponent(JSON.stringify({}));
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-java/transactions/charts/latency?environment=production&start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
          );
        });

        it('should have a successful response', () => {
          expect(response.status).to.eql(200);
        });

        it('should return the ML job id for anomalies of the selected environment', () => {
          expect(response.body).to.have.property('anomalyTimeseries');
          expect(response.body.anomalyTimeseries).to.have.property('jobId');
          expectSnapshot(response.body.anomalyTimeseries.jobId).toMatchInline(
            `"apm-production-1369-high_mean_transaction_duration"`
          );
        });

        it('should return a non-empty anomaly series', () => {
          expect(response.body).to.have.property('anomalyTimeseries');
          expect(response.body.anomalyTimeseries.anomalyBoundaries?.length).to.be.greaterThan(0);
          expectSnapshot(response.body.anomalyTimeseries.anomalyBoundaries).toMatch();
        });
      });

      describe('when not defined environment is selected', () => {
        const uiFilters = encodeURIComponent(JSON.stringify({}));
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-python/transactions/charts/latency?environment=ENVIRONMENT_NOT_DEFINED&start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
          );
        });

        it('should have a successful response', () => {
          expect(response.status).to.eql(200);
        });

        it('should return the ML job id for anomalies with no defined environment', () => {
          expect(response.body).to.have.property('anomalyTimeseries');
          expect(response.body.anomalyTimeseries).to.have.property('jobId');
          expectSnapshot(response.body.anomalyTimeseries.jobId).toMatchInline(
            `"apm-environment_not_defined-5626-high_mean_transaction_duration"`
          );
        });

        it('should return the correct anomaly boundaries', () => {
          expect(response.body).to.have.property('anomalyTimeseries');
          expectSnapshot(response.body.anomalyTimeseries.anomalyBoundaries).toMatch();
        });
      });

      describe('with all environments selected', () => {
        const uiFilters = encodeURIComponent(JSON.stringify({}));
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-java/transactions/charts/latency?environment=ENVIRONMENT_ALL&start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
          );
        });

        it('should have a successful response', () => {
          expect(response.status).to.eql(200);
        });

        it('should not return anomaly timeseries data', () => {
          expect(response.body).to.not.have.property('anomalyTimeseries');
        });
      });

      describe('with environment selected and empty kuery filter', () => {
        const uiFilters = encodeURIComponent(JSON.stringify({ kuery: '' }));
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-java/transactions/charts/latency?environment=production&start=${start}&end=${end}&transactionType=${transactionType}&uiFilters=${uiFilters}&latencyAggregationType=avg`
          );
        });

        it('should have a successful response', () => {
          expect(response.status).to.eql(200);
        });

        it('should return the ML job id for anomalies of the selected environment', () => {
          expect(response.body).to.have.property('anomalyTimeseries');
          expect(response.body.anomalyTimeseries).to.have.property('jobId');
          expectSnapshot(response.body.anomalyTimeseries.jobId).toMatchInline(
            `"apm-production-1369-high_mean_transaction_duration"`
          );
        });

        it('should return a non-empty anomaly series', () => {
          expect(response.body).to.have.property('anomalyTimeseries');
          expect(response.body.anomalyTimeseries.anomalyBoundaries?.length).to.be.greaterThan(0);
          expectSnapshot(response.body.anomalyTimeseries.anomalyBoundaries).toMatch();
        });
      });
    }
  );
}
