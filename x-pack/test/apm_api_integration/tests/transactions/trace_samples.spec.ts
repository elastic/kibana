/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import qs from 'querystring';
import { sortBy } from 'lodash';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/create_call_apm_api';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  const url = `/internal/apm/services/opbeans-java/transactions/traces/samples?${qs.stringify({
    environment: 'ENVIRONMENT_ALL',
    kuery: '',
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
        const response: {
          body: APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/traces/samples'>;
          status: number;
        } = await supertest.get(url);

        expect(response.status).to.be(200);

        expect(response.body.traceSamples.length).to.be(0);
      });
    }
  );

  registry.when(
    'Transaction trace samples response structure when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: {
        body: APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/traces/samples'>;
        status: number;
      };

      before(async () => {
        response = await supertest.get(url);
      });

      it('returns the correct metadata', () => {
        expect(response.status).to.be(200);
        expect(response.body.traceSamples.length).to.be.greaterThan(0);
      });

      it('returns the correct number of samples', () => {
        expectSnapshot(response.body.traceSamples.length).toMatchInline(`15`);
      });

      it('returns the correct samples', () => {
        const { traceSamples } = response.body;

        expectSnapshot(sortBy(traceSamples, (sample) => sample.traceId)).toMatchInline(`
          Array [
            Object {
              "traceId": "0996b09e42ad4dbfaaa6a069326c6e66",
              "transactionId": "5721364b179716d0",
            },
            Object {
              "traceId": "10d882b7118870015815a27c37892375",
              "transactionId": "0cf9db0b1e321239",
            },
            Object {
              "traceId": "2ca82e99453c58584c4b8de9a8ba4ec3",
              "transactionId": "8fa2ca73976ce1e7",
            },
            Object {
              "traceId": "45b3d1a86003938687a55e49bf3610b8",
              "transactionId": "a707456bda99ee98",
            },
            Object {
              "traceId": "4943691f87b7eb97d442d1ef33ca65c7",
              "transactionId": "f6f4677d731e57c5",
            },
            Object {
              "traceId": "5267685738bf75b68b16bf3426ba858c",
              "transactionId": "5223f43bc3154c5a",
            },
            Object {
              "traceId": "66bd97c457f5675665397ac9201cc050",
              "transactionId": "592b60cc9ddabb15",
            },
            Object {
              "traceId": "6d85d8f1bc4bbbfdb19cdba59d2fc164",
              "transactionId": "d0a16f0f52f25d6b",
            },
            Object {
              "traceId": "7483bd52150d1c93a858c60bfdd0c138",
              "transactionId": "e20e701ff93bdb55",
            },
            Object {
              "traceId": "9a84d15e5a0e32098d569948474e8e2f",
              "transactionId": "b85db78a9824107b",
            },
            Object {
              "traceId": "a21ea39b41349a4614a86321d965c957",
              "transactionId": "338bd7908cbf7f2d",
            },
            Object {
              "traceId": "ca7a2072e7974ae84b5096706c6b6255",
              "transactionId": "92ab7f2ef11685dd",
            },
            Object {
              "traceId": "d250e2a1bad40f78653d8858db65326b",
              "transactionId": "6fcd12599c1b57fa",
            },
            Object {
              "traceId": "d9415d102c0634e1e8fa53ceef07be70",
              "transactionId": "fab91c68c9b1c42b",
            },
            Object {
              "traceId": "e123f0466fa092f345d047399db65aa2",
              "transactionId": "c0af16286229d811",
            },
          ]
        `);
      });
    }
  );
}
