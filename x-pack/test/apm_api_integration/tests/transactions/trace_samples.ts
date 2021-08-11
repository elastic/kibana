/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import qs from 'querystring';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  const url = `/api/apm/services/opbeans-java/transactions/traces/samples?${qs.stringify({
    start: metadata.start,
    end: metadata.end,
    transactionName: 'APIRestController#stats',
    transactionType: 'request',
  })}`;

  registry.when(
    'Transaction trace samples response structure when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await supertest.get(url);

        expect(response.status).to.be(200);

        expect(response.body.noHits).to.be(true);
        expect(response.body.traceSamples.length).to.be(0);
      });
    }
  );

  registry.when(
    'Transaction trace samples response structure when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: any;
      before(async () => {
        response = await supertest.get(url);
      });

      it('returns the correct metadata', () => {
        expect(response.status).to.be(200);
        expect(response.body.noHits).to.be(false);
        expect(response.body.traceSamples.length).to.be.greaterThan(0);
      });

      it('returns the correct number of samples', () => {
        expectSnapshot(response.body.traceSamples.length).toMatchInline(`10`);
      });

      it('returns the correct samples', () => {
        const { traceSamples } = response.body;

        expectSnapshot(traceSamples.sort((sample: any) => sample.traceId)).toMatchInline(`
          Array [
            Object {
              "traceId": "5267685738bf75b68b16bf3426ba858c",
              "transactionId": "5223f43bc3154c5a",
            },
            Object {
              "traceId": "9a84d15e5a0e32098d569948474e8e2f",
              "transactionId": "b85db78a9824107b",
            },
            Object {
              "traceId": "e123f0466fa092f345d047399db65aa2",
              "transactionId": "c0af16286229d811",
            },
            Object {
              "traceId": "4943691f87b7eb97d442d1ef33ca65c7",
              "transactionId": "f6f4677d731e57c5",
            },
            Object {
              "traceId": "66bd97c457f5675665397ac9201cc050",
              "transactionId": "592b60cc9ddabb15",
            },
            Object {
              "traceId": "10d882b7118870015815a27c37892375",
              "transactionId": "0cf9db0b1e321239",
            },
            Object {
              "traceId": "6d85d8f1bc4bbbfdb19cdba59d2fc164",
              "transactionId": "d0a16f0f52f25d6b",
            },
            Object {
              "traceId": "0996b09e42ad4dbfaaa6a069326c6e66",
              "transactionId": "5721364b179716d0",
            },
            Object {
              "traceId": "d9415d102c0634e1e8fa53ceef07be70",
              "transactionId": "fab91c68c9b1c42b",
            },
            Object {
              "traceId": "ca7a2072e7974ae84b5096706c6b6255",
              "transactionId": "92ab7f2ef11685dd",
            },
          ]
        `);
      });
    }
  );
}
