/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { ServiceNode } from '@kbn/apm-plugin/common/connections';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { generateData } from './generate_data';
import { generateManyDependencies } from './generate_many_dependencies';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const dependencyName = 'elasticsearch';

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/dependencies/upstream_services',
      params: {
        query: {
          dependencyName,
          environment: 'production',
          kuery: '',
          numBuckets: 20,
          offset: '1d',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  describe('Dependency upstream services', () => {
    describe('when data is not loaded', () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.services).to.empty();
      });
    });

    describe('when data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await generateData({ apmSynthtraceEsClient, start, end });
      });
      after(() => apmSynthtraceEsClient.clean());

      it('returns a list of upstream services for the dependency', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.services.map(({ location }) => (location as ServiceNode).serviceName)).to.eql([
          'synth-go',
        ]);

        const currentStatsLatencyValues = body.services[0].currentStats.latency.timeseries;
        expect(currentStatsLatencyValues?.every(({ y }) => y === 1000000)).to.be(true);
      });
    });

    describe('when a high volume of data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateManyDependencies({ apmSynthtraceEsClient, from: start, to: end });
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns a list of upstream services without error', async () => {
        const response = await callApi();
        expect(response.status).to.be(200);
        expect(response.body.services.length).to.be.greaterThan(0);
      });
    });
  });
}
