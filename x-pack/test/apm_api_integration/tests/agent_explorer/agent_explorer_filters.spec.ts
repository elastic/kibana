/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace';
import { APIClientRequestParamsOf } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const goServiceName = 'opbeans-go';
  const nodeServiceName = 'opbeans-node';

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/agent_explorer/filters'>['params']
    >
  ) {
    return await apmApiClient.monitorIndicesUser({
      endpoint: 'GET /internal/apm/agent_explorer/filters',
      params: {
        query: {
          probability: 1,
          environment: 'ENVIRONMENT_ALL',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          ...overrides?.query,
        },
      },
    });
  }

  registry.when(
    'Agent explorer when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.languages).to.be.empty();
        expect(body.services).to.be.empty();
      });
    }
  );

  registry.when('Agent explorer', { config: 'basic', archives: [] }, () => {
    describe('when data is loaded', () => {
      before(async () => {
        const serviceGo = apm
          .service({ name: goServiceName, environment: 'production', agentName: 'go', agentVersion: '5.1.2' })
          .instance('instance-go');

        const serviceNodeStaging = apm
          .service({ name: nodeServiceName, environment: 'staging', agentName: 'nodejs', agentVersion: '1.0.0' })
          .instance('instance-node-staging');

        const serviceNodeDev = apm
          .service({ name: nodeServiceName, environment: 'dev', agentName: 'nodejs', agentVersion: '1.0.3' })
          .instance('instance-node-dev');

        await synthtraceEsClient.index([
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceGo
                .transaction({ transactionName: 'GET /api/product/list' })
                .duration(2000)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceNodeStaging
                .transaction({ transactionName: 'GET /api/users/list' })
                .duration(2000)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceNodeDev
                .transaction({ transactionName: 'GET /api/users/list' })
                .duration(2000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => synthtraceEsClient.clean());

      it('returns correct filters information', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);
        expect(body.services).to.have.length(2);
      });

      it('returns only filters matching selected environment', async () => {
        const { status, body } = await callApi({
          query: {
            environment: 'dev',
          },
        });
        expect(status).to.be(200);
        expect(body.services).to.have.length(1);
      });
    });
  });
}
