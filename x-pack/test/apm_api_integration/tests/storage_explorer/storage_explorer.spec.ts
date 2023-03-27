/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { IndexLifecyclePhaseSelectOption } from '@kbn/apm-plugin/common/storage_explorer_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { APIClientRequestParamsOf } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { keyBy } from 'lodash';
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
      APIClientRequestParamsOf<'GET /internal/apm/storage_explorer'>['params']
    >
  ) {
    return await apmApiClient.monitorClusterAndIndicesUser({
      endpoint: 'GET /internal/apm/storage_explorer',
      params: {
        query: {
          indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
          probability: 1,
          environment: 'ENVIRONMENT_ALL',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          kuery: '',
          ...overrides?.query,
        },
      },
    });
  }

  registry.when(
    'Storage explorer when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.serviceStatistics).to.be.empty();
      });
    }
  );

  registry.when('Storage explorer', { config: 'basic', archives: [] }, () => {
    describe('when data is loaded', () => {
      before(async () => {
        const serviceGo = apm
          .service({ name: goServiceName, environment: 'production', agentName: 'go' })
          .instance('instance-go');

        const serviceNodeStaging = apm
          .service({ name: nodeServiceName, environment: 'staging', agentName: 'node' })
          .instance('instance-node-staging');

        const serviceNodeDev = apm
          .service({ name: nodeServiceName, environment: 'dev', agentName: 'node' })
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

      it('returns correct stats', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);

        expect(body.serviceStatistics).to.have.length(2);

        const stats = keyBy(body.serviceStatistics, 'serviceName');

        const goServiceStats = stats[goServiceName];
        expect(goServiceStats?.environments).to.have.length(1);
        expect(goServiceStats?.environments).to.contain('production');
        expect(goServiceStats?.agentName).to.be('go');
        expect(goServiceStats?.size).to.be.greaterThan(0);
        expect(goServiceStats?.sampling).to.be(1);

        const nodeServiceStats = stats[nodeServiceName];
        expect(nodeServiceStats?.environments).to.have.length(2);
        expect(nodeServiceStats?.environments).to.contain('staging');
        expect(nodeServiceStats?.environments).to.contain('dev');
        expect(nodeServiceStats?.agentName).to.be('node');
        expect(nodeServiceStats?.size).to.be.greaterThan(0);
        expect(nodeServiceStats?.sampling).to.be(1);
      });

      it('returns only node service stats when there is a matching environment', async () => {
        const { status, body } = await callApi({
          query: {
            environment: 'dev',
          },
        });
        expect(status).to.be(200);
        expect(body.serviceStatistics).to.have.length(1);
        expect(body.serviceStatistics[0]?.serviceName).to.be(nodeServiceName);
      });

      it('returns empty stats when there is no matching lifecycle phase', async () => {
        const { status, body } = await callApi({
          query: {
            indexLifecyclePhase: IndexLifecyclePhaseSelectOption.Warm,
          },
        });
        expect(status).to.be(200);
        expect(body.serviceStatistics).to.be.empty();
      });

      it('returns only go service stats when there is a matching kql filter', async () => {
        const { status, body } = await callApi({
          query: {
            kuery: `service.name : ${goServiceName}`,
          },
        });
        expect(status).to.be(200);
        expect(body.serviceStatistics).to.have.length(1);
        expect(body.serviceStatistics[0]?.serviceName).to.be(goServiceName);
      });
    });
  });
}
