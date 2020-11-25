/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import qs from 'querystring';
import { isEmpty } from 'lodash';
import archives_metadata from '../../../common/archives_metadata';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  const url = `/api/apm/services/opbeans-java/transaction_groups/distribution?${qs.stringify({
    start: metadata.start,
    end: metadata.end,
    uiFilters: encodeURIComponent('{}'),
    transactionName: 'APIRestController#stats',
    transactionType: 'request',
  })}`;

  describe('Transaction groups distribution', () => {
    describe('when data is not loaded ', () => {
      it('handles empty state', async () => {
        const response = await supertest.get(url);

        expect(response.status).to.be(200);

        expect(response.body.noHits).to.be(true);
        expect(response.body.buckets.length).to.be(0);
      });
    });

    describe('when data is loaded', () => {
      let response: any;
      before(async () => {
        await esArchiver.load(archiveName);
        response = await supertest.get(url);
      });
      after(() => esArchiver.unload(archiveName));

      it('returns the correct metadata', () => {
        expect(response.status).to.be(200);
        expect(response.body.noHits).to.be(false);
        expect(response.body.buckets.length).to.be.greaterThan(0);
      });

      it('returns groups with some hits', () => {
        expect(response.body.buckets.some((bucket: any) => bucket.count > 0)).to.be(true);
      });

      it('returns groups with some samples', () => {
        expect(response.body.buckets.some((bucket: any) => !isEmpty(bucket.samples))).to.be(true);
      });

      it('returns the correct number of buckets', () => {
        expectSnapshot(response.body.buckets.length).toMatchInline(`45`);
      });

      it('returns the correct bucket size', () => {
        expectSnapshot(response.body.bucketSize).toMatchInline(`1000`);
      });

      it('returns the correct buckets', () => {
        const bucketWithSamples = response.body.buckets.find(
          (bucket: any) => !isEmpty(bucket.samples)
        );

        expectSnapshot(bucketWithSamples.count).toMatchInline(`1`);

        expectSnapshot(bucketWithSamples.samples.sort((sample: any) => sample.traceId))
          .toMatchInline(`
          Array [
            Object {
              "traceId": "3dd90c5c2035f5bcb2728a34cb48d796",
              "transactionId": "69f3ff7d35056f63",
            },
          ]
        `);
      });
    });
  });
}
