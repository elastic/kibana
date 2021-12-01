/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];
  const serviceName = 'opbeans-java';
  const serviceNodeName = '31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad';

  registry.when(
    'Service node metadata when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
          params: {
            path: { serviceName, serviceNodeName },
            query: { start, end, kuery: '' }
          },
        });

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "containerId": "N/A",
            "host": "N/A",
          }
        `);
      });
    }
  );

  registry.when(
    'Service node metadata when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns java service node metadata', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
          params: {
            path: { serviceName, serviceNodeName },
            query: { start, end, kuery: '' }
          },
        });

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "containerId": "31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad",
            "host": "N/A",
          }
        `);
      });
    }
  );
}
