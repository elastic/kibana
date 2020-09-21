/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import archives_metadata from '../../../common/archives_metadata';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);
  const transactionName = '/products';
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Average duration by browser', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/client/transaction_groups/avg_duration_by_browser?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );
        expect(response.status).to.be(200);
        expect(response.body).to.eql([]);
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns the average duration by browser', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-rum/transaction_groups/avg_duration_by_browser?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);

        expect(response.body.length).to.be.greaterThan(0);

        expectSnapshot(response.body).toMatch();

        expectSnapshot(response.body.length).toMatchInline(`1`);
      });

      it('returns the average duration by browser filtering by transaction name', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-rum/transaction_groups/avg_duration_by_browser?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionName=${transactionName}`
        );

        expect(response.status).to.be(200);

        expect(response.body.length).to.be.greaterThan(0);

        expectSnapshot(response.body.length).toMatchInline(`1`);

        expectSnapshot(response.body).toMatch();
      });
    });
  });
}
