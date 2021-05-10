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
        expectSnapshot(response.body.buckets.length).toMatchInline(`16`);
      });

      it('returns the correct bucket size', () => {
        expectSnapshot(response.body.bucketSize).toMatchInline(`5000`);
      });

      it('returns the correct buckets', () => {
        const bucketWithSamples = response.body.buckets.find(
          (bucket: any) => !isEmpty(bucket.samples)
        );

        expectSnapshot(bucketWithSamples.count).toMatchInline(`3`);

        expectSnapshot(bucketWithSamples.samples.sort((sample: any) => sample.traceId))
          .toMatchInline(`
          Array [
            Object {
              "traceId": "af0f18dc0841cfc1f567e7e1d55cfda7",
              "transactionId": "925f02e5ac122897",
            },
            Object {
              "traceId": "ccd327537120e857bdfa407434dfb9a4",
              "transactionId": "c5f923159cc1b8a6",
            },
            Object {
              "traceId": "a4eb3781a21dc11d289293076fd1a1b3",
              "transactionId": "21892bde4ff1364d",
            },
          ]
        `);
      });
    }
  );
}
