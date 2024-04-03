/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-plugin/common/es_fields/apm';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateData } from './generate_data';

const startNumber = new Date('2021-01-01T00:00:00.000Z').getTime();
const endNumber = new Date('2021-01-01T00:05:00.000Z').getTime() - 1;

const start = new Date(startNumber).toISOString();
const end = new Date(endNumber).toISOString();

export default function suggestionsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  // FLAKY: https://github.com/elastic/kibana/issues/177538
  registry.when('suggestions when data is loaded', { config: 'basic', archives: [] }, async () => {
    before(async () => {
      await generateData({
        synthtraceEsClient,
        start: startNumber,
        end: endNumber,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe(`field: ${SERVICE_ENVIRONMENT}`, () => {
      describe('when fieldValue is empty', () => {
        it('returns all environments', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: {
              query: { fieldName: SERVICE_ENVIRONMENT, fieldValue: '', start, end },
            },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "custom-php-environment",
              "development-0",
              "development-1",
              "development-2",
              "development-3",
              "development-4",
              "production-0",
              "production-1",
              "production-2",
              "production-3",
              "production-4",
              "staging-0",
              "staging-1",
              "staging-2",
              "staging-3",
              "staging-4",
            ]
          `);
        });
      });

      describe('when fieldValue is not empty', () => {
        it('returns environments that start with the fieldValue', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: { query: { fieldName: SERVICE_ENVIRONMENT, fieldValue: 'prod', start, end } },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "production-0",
              "production-1",
              "production-2",
              "production-3",
              "production-4",
            ]
          `);
        });

        it('returns environments that contain the fieldValue', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: {
              query: { fieldName: SERVICE_ENVIRONMENT, fieldValue: 'evelopment', start, end },
            },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "development-0",
              "development-1",
              "development-2",
              "development-3",
              "development-4",
            ]
          `);
        });

        it('returns no results if nothing matches', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: {
              query: { fieldName: SERVICE_ENVIRONMENT, fieldValue: 'foobar', start, end },
            },
          });

          expect(body.terms).to.eql([]);
        });
      });
    });

    describe(`field: ${SERVICE_NAME}`, () => {
      describe('when fieldValue is empty', () => {
        it('returns all service names', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: { query: { fieldName: SERVICE_NAME, fieldValue: '', start, end } },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "custom-php-service",
              "go-0",
              "go-1",
              "go-2",
              "go-3",
              "go-4",
              "java-0",
              "java-1",
              "java-2",
              "java-3",
              "java-4",
            ]
          `);
        });
      });

      describe('when fieldValue is not empty', () => {
        it('returns services that start with the fieldValue', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: { query: { fieldName: SERVICE_NAME, fieldValue: 'java', start, end } },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "java-0",
              "java-1",
              "java-2",
              "java-3",
              "java-4",
            ]
          `);
        });

        it('returns services that contains the fieldValue', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: { query: { fieldName: SERVICE_NAME, fieldValue: '1', start, end } },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "go-1",
              "java-1",
            ]
          `);
        });
      });
    });

    describe(`field: ${TRANSACTION_TYPE}`, () => {
      describe('when fieldValue is empty', () => {
        it('returns all transaction types', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: { query: { fieldName: TRANSACTION_TYPE, fieldValue: '', start, end } },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "custom-php-type",
              "my-custom-type",
            ]
          `);
        });
      });

      describe('with a string parameter', () => {
        it('returns items matching the string parameter', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: { query: { fieldName: TRANSACTION_TYPE, fieldValue: 'custom', start, end } },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "custom-php-type",
            ]
          `);
        });
      });
    });

    describe(`field: ${TRANSACTION_NAME}`, () => {
      describe('when fieldValue is empty', () => {
        it('returns all transaction names', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: { query: { fieldName: TRANSACTION_NAME, fieldValue: '', start, end } },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "GET /api/php/memory",
              "GET /api/product/:id",
              "GET /api/user/:id",
              "PUT /api/product/:id",
              "PUT /api/user/:id",
            ]
          `);
        });
      });

      describe('with a string parameter', () => {
        it('returns items matching the string parameter', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: { query: { fieldName: TRANSACTION_NAME, fieldValue: 'product', start, end } },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "GET /api/product/:id",
              "PUT /api/product/:id",
            ]
          `);
        });
      });

      describe('when limiting the suggestions to a specific service', () => {
        it('returns items matching the string parameter', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: {
              query: {
                serviceName: 'custom-php-service',
                fieldName: TRANSACTION_NAME,
                fieldValue: '',
                start,
                end,
              },
            },
          });

          expectSnapshot(body.terms).toMatchInline(`
            Array [
              "GET /api/php/memory",
            ]
          `);
        });

        it('does not return transactions from other services', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/suggestions',
            params: {
              query: {
                serviceName: 'custom-php-service',
                fieldName: TRANSACTION_NAME,
                fieldValue: 'product',
                start,
                end,
              },
            },
          });

          expect(body.terms).to.eql([]);
        });
      });
    });
  });
}
