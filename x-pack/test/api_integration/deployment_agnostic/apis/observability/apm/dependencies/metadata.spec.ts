/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { dataConfig, generateData } from './generate_data';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/dependencies/metadata`,
      params: {
        query: {
          dependencyName: dataConfig.span.destination,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  describe('Dependency metadata', () => {
    describe('when data is not loaded', () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.metadata).to.empty();
      });
    });

    describe('when data is generated', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns correct metadata for the dependency', async () => {
        await generateData({ apmSynthtraceEsClient, start, end });

        const { status, body } = await callApi();
        const { span } = dataConfig;

        expect(status).to.be(200);
        expect(body.metadata.spanType).to.equal(span.type);
        expect(body.metadata.spanSubtype).to.equal(span.subType);

        await apmSynthtraceEsClient.clean();
      });
    });
  });
}
