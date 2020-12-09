/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { first, last } from 'lodash';
import archives_metadata from '../../../common/archives_metadata';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Error rate', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/transactions/charts/error_rate?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );
        expect(response.status).to.be(200);

        expect(response.body.noHits).to.be(true);

        expect(response.body.transactionErrorRate.length).to.be(0);
        expect(response.body.average).to.be(null);
      });
    });
    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('returns the transaction error rate', () => {
        let errorRateResponse: {
          transactionErrorRate: Array<{ x: number; y: number | null }>;
          average: number;
        };
        before(async () => {
          const response = await supertest.get(
            `/api/apm/services/opbeans-java/transactions/charts/error_rate?start=${start}&end=${end}&uiFilters=${uiFilters}`
          );
          errorRateResponse = response.body;
        });

        it('returns some data', () => {
          expect(errorRateResponse.average).to.be.greaterThan(0);

          expect(errorRateResponse.transactionErrorRate.length).to.be.greaterThan(0);

          const nonNullDataPoints = errorRateResponse.transactionErrorRate.filter(
            ({ y }) => y !== null
          );

          expect(nonNullDataPoints.length).to.be.greaterThan(0);
        });

        it('has the correct start date', () => {
          expectSnapshot(
            new Date(first(errorRateResponse.transactionErrorRate)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2020-12-08T13:57:30.000Z"`);
        });

        it('has the correct end date', () => {
          expectSnapshot(
            new Date(last(errorRateResponse.transactionErrorRate)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2020-12-08T14:27:30.000Z"`);
        });

        it('has the correct number of buckets', () => {
          expectSnapshot(errorRateResponse.transactionErrorRate.length).toMatchInline(`61`);
        });

        it('has the correct calculation for average', () => {
          expectSnapshot(errorRateResponse.average).toMatchInline(`0.16`);
        });

        it('has the correct error rate', () => {
          expectSnapshot(errorRateResponse.transactionErrorRate).toMatch();
        });
      });
    });
  });
}
