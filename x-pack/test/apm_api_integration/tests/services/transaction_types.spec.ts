/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);

  registry.when(
    'Transaction types when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          `/internal/apm/services/opbeans-node/transaction_types?start=${start}&end=${end}`
        );

        expect(response.status).to.be(200);

        expect(response.body.transactionTypes.length).to.be(0);
      });
    }
  );

  registry.when(
    'Transaction types when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          `/internal/apm/services/opbeans-node/transaction_types?start=${start}&end=${end}`
        );

        expect(response.status).to.be(200);
        expect(response.body.transactionTypes.length).to.be.greaterThan(0);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "transactionTypes": Array [
              "request",
              "Worker",
            ],
          }
        `);
      });
    }
  );
}
