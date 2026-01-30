/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { generateManyDependencies } from '../../dependencies/generate_many_dependencies';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const start = new Date('2021-10-10T00:00:00.000Z').getTime();
  const end = new Date('2021-10-10T00:15:00.000Z').getTime() - 1;

  const serviceName = 'synth-java-0';

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/dependencies/breakdown',
      params: {
        path: { serviceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'production',
          kuery: '',
        },
      },
    });
  }

  describe('Service dependencies breakdown', () => {
    describe('when no data is loaded', () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.breakdown).to.be.empty();
      });
    });

    describe('when a high volume of data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateManyDependencies({ apmSynthtraceEsClient, from: start, to: end });
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns a breakdown of dependencies without error', async () => {
        const response = await callApi();
        expect(response.status).to.be(200);
        expect(response.body.breakdown.length).to.be.greaterThan(0);
      });
    });
  });
}
