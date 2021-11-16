/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../plugins/apm/common/elasticsearch_fieldnames';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function suggestionsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const archiveName = 'apm_8.0.0';

  registry.when(
    'suggestions when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('with environment', () => {
        describe('with an empty string parameter', () => {
          it('returns all environments', async () => {
            const { body } = await apmApiClient.readUser({
              endpoint: 'GET /internal/apm/suggestions',
              params: { query: { field: SERVICE_ENVIRONMENT, string: '' } },
            });

            expectSnapshot(body).toMatchInline(`
          Object {
            "terms": Array [
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
              endpoint: 'GET /internal/apm/suggestions',
              params: { query: { field: SERVICE_ENVIRONMENT, string: 'pr' } },
            });

            expectSnapshot(body).toMatchInline(`
            Object {
              "terms": Array [
                "production",
              ],
            }
          `);
          });
        });
      });

      describe('with service name', () => {
        describe('with an empty string parameter', () => {
          it('returns all services', async () => {
            const { body } = await apmApiClient.readUser({
              endpoint: 'GET /internal/apm/suggestions',
              params: { query: { field: SERVICE_NAME, string: '' } },
            });

            expectSnapshot(body).toMatchInline(`
              Object {
                "terms": Array [
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
        });

        describe('with a string parameter', () => {
          it('returns items matching the string parameter', async () => {
            const { body } = await apmApiClient.readUser({
              endpoint: 'GET /internal/apm/suggestions',
              params: { query: { field: SERVICE_NAME, string: 'aud' } },
            });

            expectSnapshot(body).toMatchInline(`
              Object {
                "terms": Array [
                  "auditbeat",
                ],
              }
            `);
          });
        });
      });

      describe('with transaction type', () => {
        describe('with an empty string parameter', () => {
          it('returns all transaction types', async () => {
            const { body } = await apmApiClient.readUser({
              endpoint: 'GET /internal/apm/suggestions',
              params: { query: { field: TRANSACTION_TYPE, string: '' } },
            });

            expectSnapshot(body).toMatchInline(`
                Object {
                  "terms": Array [
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
          it('returns items matching the string parameter', async () => {
            const { body } = await apmApiClient.readUser({
              endpoint: 'GET /internal/apm/suggestions',
              params: { query: { field: TRANSACTION_TYPE, string: 'w' } },
            });

            expectSnapshot(body).toMatchInline(`
                Object {
                  "terms": Array [
                    "Worker",
                  ],
                }
              `);
          });
        });
      });
    }
  );
}
