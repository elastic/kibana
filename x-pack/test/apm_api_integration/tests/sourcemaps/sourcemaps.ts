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
  const end = new Date('2021-01-01T00:05:00.000Z').getTime() - 1;

  registry.when('source maps', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateData({ synthtraceEsClient, start, end });
    });

    it('can upload a sourcemap', async () => {
      const response = await apmApiClient.readUser({
        endpoint: 'POST /api/apm/sourcemaps',
        params: {
          body: { bundle_filepath: '', service_name: '', service_version: '', sourcemap: '' },
        },
      });

      expect(response).to.be('foo');
    });

    it('can list sourcemaps', async () => {
      const response = await apmApiClient.readUser({
        endpoint: 'GET /api/apm/sourcemaps',
      });

      expect(response).to.be('foo');
    });

    it('can delete a sourcemap', async () => {
      const response = await apmApiClient.readUser({
        endpoint: 'DELETE /api/apm/sourcemaps/{id}',
        params: { path: { id: '' } },
      });

      expect(response).to.be('foo');
    });
  });
}
