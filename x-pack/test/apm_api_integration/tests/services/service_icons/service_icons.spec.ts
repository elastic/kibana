/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { dataConfig, generateData } from './generate_data';

type ServiceIconMetadata = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/icons'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const { serviceName } = dataConfig;
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/metadata/icons',
      params: {
        path: { serviceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  registry.when('Service icons when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const { status, body } = await callApi();

      expect(status).to.be(200);
      expect(body).to.empty();
    });
  });

  registry.when(
    'Service icons when data is generated',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      let body: ServiceIconMetadata;
      let status: number;

      before(async () => {
        await generateData({ synthtraceEsClient, start, end });
        const response = await callApi();
        body = response.body;
        status = response.status;
      });

      after(() => synthtraceEsClient.clean());

      it('returns correct HTTP status', () => {
        expect(status).to.be(200);
      });

      it('returns correct metadata', () => {
        const { agentName, cloud } = dataConfig;
        const { provider, serviceName: cloudServiceName } = cloud;

        expect(body.agentName).to.be(agentName);
        expect(body.cloudProvider).to.be(provider);
        expect(body.containerType).to.be('Kubernetes');
        expect(body.serverlessType).to.be(cloudServiceName);
      });
    }
  );
}
