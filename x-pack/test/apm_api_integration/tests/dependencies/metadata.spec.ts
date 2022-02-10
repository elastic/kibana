/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { dataConfig, generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/backends/metadata`,
      params: {
        query: {
          backendName: dataConfig.span.destination,
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
    'Dependency metadata when data is generated',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      after(() => synthtraceEsClient.clean());

      it('returns correct metadata for the dependency', async () => {
        await generateData({ synthtraceEsClient, start, end });

        const { status, body } = await callApi();
        const { span } = dataConfig;

        expect(status).to.be(200);
        expect(body.metadata.spanType).to.equal(span.type);
        expect(body.metadata.spanSubtype).to.equal(span.subType);

        await synthtraceEsClient.clean();
      });
    }
  );
}
