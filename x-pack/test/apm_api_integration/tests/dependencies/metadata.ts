/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { dataConfig, generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const backendName = 'elasticsearh';

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/backends/metadata`,
      params: {
        query: {
          backendName,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  registry.when(
    'Dependency metadata when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.metadata).to.empty();
      });
    }
  );

  registry.when(
    'Dependency metadata when data is loaded',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      it('returns correct metadata for the dependency', async () => {
        await generateData({ synthtraceEsClient, backendName, start, end });
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.metadata.spanType).to.equal(dataConfig.spanType);
        expect(body.metadata.spanSubtype).to.equal(backendName);
      });
    }
  );
}
