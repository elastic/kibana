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
        expectSnapshot(response.body.buckets.length).toMatchInline(`11`);
      });

      it('returns the correct bucket size', () => {
        expectSnapshot(response.body.bucketSize).toMatchInline(`5000`);
      });

      it('returns the correct buckets', () => {
        const bucketWithSamples = response.body.buckets.find(
          (bucket: any) => !isEmpty(bucket.samples)
        );

        expectSnapshot(bucketWithSamples.count).toMatchInline(`7`);

        expectSnapshot(bucketWithSamples.samples.sort((sample: any) => sample.traceId))
          .toMatchInline(`
          Array [
            Object {
              "traceId": "5a12a1b3f6519590b1884347742d0397",
              "transactionId": "92ef38a10a06acff",
            },
            Object {
              "traceId": "768edc6d38f2160fbdb4bff917309912",
              "transactionId": "f75e9a374d4340d0",
            },
            Object {
              "traceId": "43dcb7085cd86be507e01f0715343354",
              "transactionId": "46af5002aa3a6df1",
            },
            Object {
              "traceId": "c896cc86ea8e5c87d82735a19bfeec5a",
              "transactionId": "2483bf8eb1e8e359",
            },
            Object {
              "traceId": "9c9a6fe0a9911ce5e6f55d3941ab0993",
              "transactionId": "bf2b29529942f361",
            },
            Object {
              "traceId": "995d8dfb5ed448c6cef98e07c79851b6",
              "transactionId": "55cff62b0b06ab2d",
            },
            Object {
              "traceId": "ece56ae7f028a5ae0f6ab96771869295",
              "transactionId": "73561b58cea38811",
            },
            Object {
              "traceId": "f518c4073b4dbc6fe766b2f44ea123f1",
              "transactionId": "fe1444b7e2f78af6",
            },
          ]
        `);
      });
    }
  );
}
