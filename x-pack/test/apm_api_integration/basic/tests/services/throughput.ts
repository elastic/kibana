/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import qs from 'querystring';
import { first, last } from 'lodash';
import archives_metadata from '../../../common/archives_metadata';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  describe('Throughput', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/throughput?${qs.stringify({
            start: metadata.start,
            end: metadata.end,
            uiFilters: encodeURIComponent('{}'),
            transactionType: 'request',
          })}`
        );
        expect(response.status).to.be(200);

        expect(response.body.noHits).to.be(true);

        expect(response.body.throughput.length).to.be(0);
        expect(response.body.average).to.be(null);
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('returns the service throughput', () => {
        let throughputResponse: {
          throughput: Array<{ x: number; y: number | null }>;
          average: number;
        };
        before(async () => {
          const response = await supertest.get(
            `/api/apm/services/opbeans-java/throughput?${qs.stringify({
              start: metadata.start,
              end: metadata.end,
              uiFilters: encodeURIComponent('{}'),
              transactionType: 'request',
            })}`
          );
          throughputResponse = response.body;
        });

        it('returns some data', () => {
          expect(throughputResponse.average).to.be.greaterThan(0);

          expect(throughputResponse.throughput.length).to.be.greaterThan(0);

          const nonNullDataPoints = throughputResponse.throughput.filter(({ y }) => y !== null);

          expect(nonNullDataPoints.length).to.be.greaterThan(0);
        });

        it('has the correct start date', () => {
          expectSnapshot(
            new Date(first(throughputResponse.throughput)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2020-09-29T14:30:00.000Z"`);
        });

        it('has the correct end date', () => {
          expectSnapshot(
            new Date(last(throughputResponse.throughput)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2020-09-29T15:00:00.000Z"`);
        });

        it('has the correct number of buckets', () => {
          expectSnapshot(throughputResponse.throughput.length).toMatchInline(`61`);
        });

        it('has the correct calculation for average', () => {
          expectSnapshot(throughputResponse.average).toMatchInline(`0.152173913043478`);
        });

        it('has the correct throughput', () => {
          expectSnapshot(throughputResponse.throughput).toMatch();
        });
      });
    });
  });
}
