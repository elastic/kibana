/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import qs from 'querystring';
import { isEmpty } from 'lodash';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  const url = `/api/apm/services/opbeans-java/transactions/charts/distribution?${qs.stringify({
    start: metadata.start,
    end: metadata.end,
    transactionName: 'APIRestController#stats',
    transactionType: 'request',
    environment: 'ENVIRONMENT_ALL',
    kuery: '',
  })}`;

  registry.when(
    'Transaction groups distribution when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await supertest.get(url);

        expect(response.status).to.be(200);

        expect(response.body.noHits).to.be(true);
        expect(response.body.buckets.length).to.be(0);
      });
    }
  );

  registry.when(
    'Transaction groups distribution when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: any;
      before(async () => {
        response = await supertest.get(url);
      });

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
        expectSnapshot(response.body.buckets.length).toMatchInline(`26`);
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
              "traceId": "6d85d8f1bc4bbbfdb19cdba59d2fc164",
              "transactionId": "d0a16f0f52f25d6b",
            },
          ]
        `);
      });
    }
  );
}
