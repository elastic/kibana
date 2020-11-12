/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import archives_metadata from '../../../common/archives_metadata';
import { PromiseReturnType } from '../../../../../plugins/observability/typings/common';
import { expectSnapshot } from '../../../common/match_snapshot';
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

  describe('Transaction charts', () => {
    describe('when data is not loaded ', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/charts?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);

        expect(response.body.apmTimeseries.overallAvgDuration).to.be(null);
        expect(response.body.apmTimeseries.responseTimes.avg.length).to.be(0);
        expect(response.body.apmTimeseries.responseTimes.p95.length).to.be(0);
        expect(response.body.apmTimeseries.responseTimes.p99.length).to.be(0);
        expect(response.body.apmTimeseries.tpmBuckets.length).to.be(0);
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      let response: PromiseReturnType<typeof supertest.get>;

      before(async () => {
        response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/charts?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );
      });

      it('returns some data', async () => {
        expect(response.status).to.be(200);

        expect(response.body.apmTimeseries.overallAvgDuration).not.to.be(null);
        expect(response.body.apmTimeseries.responseTimes.avg.length).to.be.greaterThan(0);
        expect(response.body.apmTimeseries.responseTimes.p95.length).to.be.greaterThan(0);
        expect(response.body.apmTimeseries.responseTimes.p99.length).to.be.greaterThan(0);
        expect(response.body.apmTimeseries.tpmBuckets.length).to.be.greaterThan(0);
      });

      it('returns the correct data', () => {
        expectSnapshot(response.body.apmTimeseries.overallAvgDuration).toMatchInline(
          `600888.274678112`
        );
        expectSnapshot(response.body.apmTimeseries.responseTimes.avg.length).toMatchInline(`61`);
        expectSnapshot(response.body.apmTimeseries.tpmBuckets.length).toMatchInline(`3`);

        expectSnapshot(response.body).toMatch();
      });
    });
  });
}
