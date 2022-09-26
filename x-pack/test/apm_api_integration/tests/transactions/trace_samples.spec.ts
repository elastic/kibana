/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Transaction trace samples response structure when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transactions/traces/samples',
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              transactionName: 'APIRestController#stats',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);

        expect(response.body.traceSamples.length).to.be(0);
      });
    }
  );

  registry.when(
    'Transaction trace samples response structure when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct samples', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transactions/traces/samples',
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              transactionName: 'APIRestController#stats',
              kuery: '',
            },
          },
        });

        const { traceSamples } = response.body;

        expect(response.status).to.be(200);
        expectSnapshot(response.body.traceSamples.length).toMatchInline(`15`);
        expectSnapshot(traceSamples).toMatchInline(`
          Array [
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:19:11.880Z",
              "traceId": "6d85d8f1bc4bbbfdb19cdba59d2fc164",
              "transactionId": "d0a16f0f52f25d6b",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:19:10.914Z",
              "traceId": "10d882b7118870015815a27c37892375",
              "transactionId": "0cf9db0b1e321239",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:17:50.702Z",
              "traceId": "45b3d1a86003938687a55e49bf3610b8",
              "transactionId": "a707456bda99ee98",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:17:47.588Z",
              "traceId": "2ca82e99453c58584c4b8de9a8ba4ec3",
              "transactionId": "8fa2ca73976ce1e7",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:17:09.819Z",
              "traceId": "a21ea39b41349a4614a86321d965c957",
              "transactionId": "338bd7908cbf7f2d",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:15:15.804Z",
              "traceId": "ca7a2072e7974ae84b5096706c6b6255",
              "transactionId": "92ab7f2ef11685dd",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:15:00.171Z",
              "traceId": "d250e2a1bad40f78653d8858db65326b",
              "transactionId": "6fcd12599c1b57fa",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:14:34.640Z",
              "traceId": "66bd97c457f5675665397ac9201cc050",
              "transactionId": "592b60cc9ddabb15",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:11:55.249Z",
              "traceId": "d9415d102c0634e1e8fa53ceef07be70",
              "transactionId": "fab91c68c9b1c42b",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:03:29.734Z",
              "traceId": "0996b09e42ad4dbfaaa6a069326c6e66",
              "transactionId": "5721364b179716d0",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T07:03:05.825Z",
              "traceId": "7483bd52150d1c93a858c60bfdd0c138",
              "transactionId": "e20e701ff93bdb55",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T06:58:34.565Z",
              "traceId": "4943691f87b7eb97d442d1ef33ca65c7",
              "transactionId": "f6f4677d731e57c5",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T06:55:02.016Z",
              "traceId": "9a84d15e5a0e32098d569948474e8e2f",
              "transactionId": "b85db78a9824107b",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T06:54:37.915Z",
              "traceId": "e123f0466fa092f345d047399db65aa2",
              "transactionId": "c0af16286229d811",
            },
            Object {
              "score": 0,
              "timestamp": "2021-08-03T06:53:18.507Z",
              "traceId": "5267685738bf75b68b16bf3426ba858c",
              "transactionId": "5223f43bc3154c5a",
            },
          ]
        `);
      });
    }
  );
}
