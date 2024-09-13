/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateData } from './generate_data';

const startNumber = new Date('2021-01-01T00:00:00.000Z').getTime();
const endNumber = new Date('2021-01-01T00:05:00.000Z').getTime() - 1;

const start = new Date(startNumber).toISOString();
const end = new Date(endNumber).toISOString();

export default function environmentsAPITests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  registry.when('environments when data is loaded', { config: 'basic', archives: [] }, async () => {
    before(async () =>
      generateData({
        apmSynthtraceEsClient,
        start: startNumber,
        end: endNumber,
      })
    );

    after(() => apmSynthtraceEsClient.clean());

    describe('get environments', () => {
      describe('when service name is not specified', () => {
        it('returns all environments', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/environments',
            params: {
              query: { start, end },
            },
          });
          expect(body.environments.length).to.be.equal(4);
          expectSnapshot(body.environments).toMatchInline(`
            Array [
              "development",
              "production",
              "staging",
              "custom-go-environment",
            ]
          `);
        });
      });

      describe('when service name is specified', () => {
        it('returns service specific environments for go', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/environments',
            params: {
              query: { start, end, serviceName: 'go' },
            },
          });

          expect(body.environments.length).to.be.equal(4);
          expectSnapshot(body.environments).toMatchInline(`
            Array [
              "custom-go-environment",
              "development",
              "production",
              "staging",
            ]
          `);
        });

        it('returns service specific environments for java', async () => {
          const { body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/environments',
            params: {
              query: { start, end, serviceName: 'java' },
            },
          });

          expect(body.environments.length).to.be.equal(3);
          expectSnapshot(body.environments).toMatchInline(`
            Array [
              "development",
              "production",
              "staging",
            ]
          `);
        });
      });
    });
  });
}
