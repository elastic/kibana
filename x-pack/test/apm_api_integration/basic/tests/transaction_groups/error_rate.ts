/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { first, last } from 'lodash';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-08-26T11:00:00.000Z');
  const end = encodeURIComponent('2020-08-26T11:30:00.000Z');
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Error rate', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/transaction_groups/error_rate?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );
        expect(response.status).to.be(200);
        expect(response.body).to.eql({
          noHits: true,
          erroneousTransactionsRate: [],
          average: null,
        });
      });
    });
    describe('when data is loaded', () => {
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      describe('returns the transaction error rate', () => {
        let errorRateResponse: {
          erroneousTransactionsRate: Array<{ x: number; y: number | null }>;
          average: number;
        };
        before(async () => {
          const response = await supertest.get(
            `/api/apm/services/opbeans-java/transaction_groups/error_rate?start=${start}&end=${end}&uiFilters=${uiFilters}`
          );
          errorRateResponse = response.body;
        });

        it('has the correct start date', () => {
          expectSnapshot(
            new Date(first(errorRateResponse.erroneousTransactionsRate)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2020-08-26T11:00:00.000Z"`);
        });

        it('has the correct end date', () => {
          expectSnapshot(
            new Date(last(errorRateResponse.erroneousTransactionsRate)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2020-08-26T11:30:00.000Z"`);
        });

        it('has the correct number of buckets', () => {
          expectSnapshot(errorRateResponse.erroneousTransactionsRate.length).toMatchInline(`61`);
        });

        it('has the correct calculation for average', () => {
          expectSnapshot(errorRateResponse.average).toMatchInline(`0.18894993894993897`);
        });

        it('has the correct error rate', () => {
          expectSnapshot(first(errorRateResponse.erroneousTransactionsRate)?.y).toMatchInline(
            `0.5`
          );
        });
      });
    });
  });
}
