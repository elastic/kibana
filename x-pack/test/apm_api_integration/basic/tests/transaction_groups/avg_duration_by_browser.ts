/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');
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
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      it('returns the average duration by browser', async () => {
        const response = await supertest.get(
          `/api/apm/services/client/transaction_groups/avg_duration_by_browser?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatch();
      });
      it('returns the average duration by browser filtering by transaction name', async () => {
        const response = await supertest.get(
          `/api/apm/services/client/transaction_groups/avg_duration_by_browser?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionName=${transactionName}`
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatch();
      });
    });
  });
}
