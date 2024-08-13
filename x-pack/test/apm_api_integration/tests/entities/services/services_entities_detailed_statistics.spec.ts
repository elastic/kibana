/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { APIClientRequestParamsOf } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const apmApiClient = getService('apmApiClient');

  const start = '2024-01-01T00:00:00.000Z';
  const end = '2024-01-01T00:59:59.999Z';

  const serviceNames = ['my-service', 'synth-go'];

  async function getServiceEntitiesDetailedStats(
    overrides?: Partial<
      APIClientRequestParamsOf<'POST /internal/apm/entities/services/detailed_statistics'>['params']['query']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: `POST /internal/apm/entities/services/detailed_statistics`,
      params: {
        query: {
          start,
          end,
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides,
        },
        body: {
          serviceNames: JSON.stringify(serviceNames),
        },
      },
    });

    return response;
  }

  registry.when(
    'Services entities detailed statistics when no data is generated',
    { config: 'basic', archives: [] },
    () => {
      describe('Service entities detailed', () => {
        it('handles the empty state', async () => {
          const response = await getServiceEntitiesDetailedStats();
          expect(response.status).to.be(200);
          expect(response.body.currentPeriod).to.empty();
        });
      });
    }
  );
}
