/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import archives_metadata from '../../../common/archives_metadata';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);

  describe('Transaction types', () => {
    describe('when data is not loaded ', () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_types?start=${start}&end=${end}`
        );

        expect(response.status).to.be(200);

        expect(response.body.transactionTypes.length).to.be(0);
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('handles empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_types?start=${start}&end=${end}`
        );

        expect(response.status).to.be(200);
        expect(response.body.transactionTypes.length).to.be.greaterThan(0);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "transactionTypes": Array [
              "Worker",
              "request",
            ],
          }
        `);
      });
    });
  });
}
