/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { dataConfig, generateData } from './generate_data';

type DependenciesMetadata = APIReturnType<'GET /internal/apm/backends/metadata'>;

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

  registry.when('Dependencies when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(response.body.metadata).to.empty();
    });
  });

  registry.when('Dependencies metadata', { config: 'basic', archives: ['apm_8.0.0_empty'] }, () => {
    describe('when data is loaded', () => {
      before(async () => {
        await generateData({ synthtraceEsClient, backendName, start, end });
      });

      after(() => synthtraceEsClient.clean());

      describe('returns the correct data', () => {
        let dependencyMetadata: DependenciesMetadata;

        before(async () => {
          const response = await callApi();
          dependencyMetadata = response.body;
        });

        it('returns correct metadata for the dependency', () => {
          expect(dependencyMetadata.metadata.spanType).to.equal(dataConfig.spanType);
          expect(dependencyMetadata.metadata.spanSubtype).to.equal(backendName);
        });
      });
    });
  });
}
