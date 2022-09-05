/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(serviceName: string) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/infrastructure_attributes',
      params: {
        path: {
          serviceName,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
        },
      },
    });
    return response;
  }

  registry.when(
    'Infrastructure attributes when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await callApi('synth-go');
        expect(response.status).to.be(200);
        expect(response.body.containerIds.length).to.be(0);
        expect(response.body.hostNames.length).to.be(0);
        expect(response.body.podNames.length).to.be(0);
      });
    }
  );

  registry.when('Infrastructure attributes', { config: 'basic', archives: [] }, () => {
    describe('when data is loaded', () => {
      beforeEach(async () => {
        await generateData({ start, end, synthtraceEsClient });
      });

      afterEach(() => synthtraceEsClient.clean());

      describe('when service runs in container', () => {
        it('returns arrays of container ids and pod names', async () => {
          const response = await callApi('synth-go');
          expect(response.status).to.be(200);
          expect(response.body.containerIds.length).to.be(1);
          expect(response.body.hostNames.length).to.be(1);
          expect(response.body.podNames.length).to.be(1);
        });
      });

      describe('when service does NOT run in container', () => {
        it('returns array of host names', async () => {
          const response = await callApi('synth-java');
          expect(response.status).to.be(200);
          expect(response.body.containerIds.length).to.be(0);
          expect(response.body.hostNames.length).to.be(1);
          expect(response.body.podNames.length).to.be(0);
        });
      });
    });
  });
}
