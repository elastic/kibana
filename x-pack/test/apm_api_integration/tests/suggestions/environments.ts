/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function environmentsSuggestionTests({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const archiveName = 'apm_8.0.0';

  registry.when(
    'environment suggestions when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('with an empty string parameter', () => {
        it('returns all environments', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /api/apm/suggestions/environments',
            params: { query: { string: '' } },
          });

          expectSnapshot(body).toMatchInline(`
          Object {
            "environments": Array [
              "production",
              "testing",
            ],
          }
        `);
        });
      });

      describe('with a string parameter', () => {
        it('returns items matching the string parameter', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /api/apm/suggestions/environments',
            params: { query: { string: 'pr' } },
          });

          expectSnapshot(body).toMatchInline(`
            Object {
              "environments": Array [
                "production",
              ],
            }
          `);
        });
      });
    }
  );
}
