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
    'service name suggestions when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns all services', async () => {
        const { body } = await apmApiClient.readUser({
          endpoint: 'GET /api/apm/suggestions/service_names',
        });

        expectSnapshot(body).toMatchInline(`
          Object {
            "serviceNames": Array [
              "ALL_OPTION_VALUE",
              "auditbeat",
              "opbeans-dotnet",
              "opbeans-go",
              "opbeans-java",
              "opbeans-node",
              "opbeans-python",
              "opbeans-ruby",
              "opbeans-rum",
            ],
          }
        `);
      });

      it('filters by environment and transaction type', async () => {
        const { body } = await apmApiClient.readUser({
          endpoint: 'GET /api/apm/suggestions/service_names',
          params: { query: { environment: 'production', transactionType: 'request' } },
        });

        expectSnapshot(body).toMatchInline(`
          Object {
            "serviceNames": Array [
              "ALL_OPTION_VALUE",
              "auditbeat",
              "opbeans-dotnet",
              "opbeans-go",
              "opbeans-java",
              "opbeans-node",
              "opbeans-python",
              "opbeans-ruby",
              "opbeans-rum",
            ],
          }
        `);
      });
    }
  );
}
