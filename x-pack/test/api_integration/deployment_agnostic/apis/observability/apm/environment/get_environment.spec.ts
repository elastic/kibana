/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

async function generateData({
  apmSynthtraceEsClient,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const environmentNames = ['production', 'development', 'staging'];
  const serviceNames = ['go', 'java', 'node'];

  const services = environmentNames.flatMap((environment) => {
    return serviceNames.flatMap((serviceName) => {
      return apm
        .service({
          name: serviceName,
          environment,
          agentName: serviceName,
        })
        .instance('instance-a');
    });
  });

  const goServiceWithAdditionalEnvironment = apm
    .service({
      name: 'go',
      environment: 'custom-go-environment',
      agentName: 'go',
    })
    .instance('instance-a');

  // Generate a transaction for each service
  const docs = timerange(start, end)
    .ratePerMinute(1)
    .generator((timestamp) => {
      const loopGeneratedDocs = services.flatMap((service) => {
        return service
          .transaction({ transactionName: 'GET /api/product/:id' })
          .timestamp(timestamp)
          .duration(1000);
      });

      const customDoc = goServiceWithAdditionalEnvironment
        .transaction({
          transactionName: 'GET /api/go/memory',
          transactionType: 'custom-go-type',
        })
        .timestamp(timestamp)
        .duration(1000);

      return [...loopGeneratedDocs, customDoc];
    });

  return apmSynthtraceEsClient.index(docs);
}

const startNumber = new Date('2021-01-01T00:00:00.000Z').getTime();
const endNumber = new Date('2021-01-01T00:05:00.000Z').getTime() - 1;

const start = new Date(startNumber).toISOString();
const end = new Date(endNumber).toISOString();

export default function environmentsAPITests({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  describe('get environments', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await generateData({
        apmSynthtraceEsClient,
        start: startNumber,
        end: endNumber,
      });
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

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
}
