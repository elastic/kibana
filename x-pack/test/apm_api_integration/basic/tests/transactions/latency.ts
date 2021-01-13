/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import archives_metadata from '../../../common/fixtures/es_archiver/archives_metadata';
import { PromiseReturnType } from '../../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);
  const uiFilters = encodeURIComponent(JSON.stringify({ environment: 'testing' }));

  describe('Latency', () => {
    describe('when data is not loaded ', () => {
      it('returns 400 when latencyAggregationType is not informed', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transactions/charts/latency?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=request`
        );

        expect(response.status).to.be(400);
      });

      it('returns 400 when transactionType is not informed', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transactions/charts/latency?start=${start}&end=${end}&uiFilters=${uiFilters}&latencyAggregationType=avg`
        );

        expect(response.status).to.be(400);
      });

      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transactions/charts/latency?start=${start}&end=${end}&uiFilters=${uiFilters}&latencyAggregationType=avg&transactionType=request`
        );

        expect(response.status).to.be(200);

        expect(response.body.overallAvgDuration).to.be(null);
        expect(response.body.latencyTimeseries.length).to.be(0);
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      let response: PromiseReturnType<typeof supertest.get>;

      describe('average latency type', () => {
        before(async () => {
          response = await supertest.get(
            `/api/apm/services/opbeans-node/transactions/charts/latency?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=request&latencyAggregationType=avg`
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
            `/api/apm/services/opbeans-node/transactions/charts/latency?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=request&latencyAggregationType=p95`
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
            `/api/apm/services/opbeans-node/transactions/charts/latency?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=request&latencyAggregationType=p99`
          );
        });

        it('returns average duration and timeseries', async () => {
          expect(response.status).to.be(200);
          expect(response.body.overallAvgDuration).not.to.be(null);
          expect(response.body.latencyTimeseries.length).to.be.eql(61);
        });
      });
    });
  });
}
