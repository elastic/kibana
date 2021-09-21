/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function serviceNameSuggestionTests({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const archiveName = 'apm_8.0.0';

  registry.when(
    'transaction type suggestions when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('with an empty string parameter', () => {
        it('returns all transaction types', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /api/apm/suggestions/transaction_types',
            params: { query: { string: '' } },
          });

          expectSnapshot(body).toMatchInline(`
            Object {
              "transactionTypes": Array [
                "Worker",
                "celery",
                "page-load",
                "request",
              ],
            }
          `);
        });
      });

      describe('with a string parameter', () => {
        it.only('returns items matching the string parameter', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /api/apm/suggestions/transaction_types',
            params: { query: { string: 'w' } },
          });

          expectSnapshot(body).toMatchInline(`
            Object {
              "transactionTypes": Array [
                "Worker",
              ],
            }
          `);
        });
      });
    }
  );
}
