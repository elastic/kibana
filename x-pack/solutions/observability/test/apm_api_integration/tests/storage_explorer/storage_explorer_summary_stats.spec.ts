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
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const goServiceName = 'opbeans-go';
  const nodeServiceName = 'opbeans-node';

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/storage_explorer_summary_stats'>['params']
    >
  ) {
    return await apmApiClient.monitorClusterAndIndicesUser({
      endpoint: 'GET /internal/apm/storage_explorer_summary_stats',
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
    'Storage Explorer summary stats when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.tracesPerMinute).to.be(0);
        expect(body.numberOfServices).to.be(0);
        expect(body.totalSize).to.be(0);
        expect(body.estimatedIncrementalSize).to.be(0);
        expect(body.diskSpaceUsedPct).to.be(0);
        expect(body.dailyDataGeneration).to.be(0);
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177518
  registry.when('Storage Explorer summary stats', { config: 'basic', archives: [] }, () => {
    describe('when data is loaded', () => {
      before(async () => {
        const serviceGo = apm
          .service({ name: goServiceName, environment: 'production', agentName: 'go' })
          .instance('instance-go');

        const serviceNode = apm
          .service({ name: nodeServiceName, environment: 'dev', agentName: 'node' })
          .instance('instance-node');

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              serviceGo
                .transaction({ transactionName: 'GET /api/product/list' })
                .duration(2000)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              serviceNode
                .transaction({ transactionName: 'GET /api/users/list' })
                .duration(2000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns correct summary stats', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.numberOfServices).to.be(2);
        expect(roundNumber(body.tracesPerMinute)).to.be(2);
        expect(body.totalSize).to.be.greaterThan(0);
        expect(body.estimatedIncrementalSize).to.be.greaterThan(0);
        expect(body.diskSpaceUsedPct).to.be.greaterThan(0);
        expect(body.dailyDataGeneration).to.be.greaterThan(0);
      });

      it('returns only node service summary stats when there is a matching environment', async () => {
        const { status, body } = await callApi({
          query: {
            environment: 'dev',
          },
        });

        expect(status).to.be(200);
        expect(body.numberOfServices).to.be(1);
        expect(roundNumber(body.tracesPerMinute)).to.be(1);
        expect(body.totalSize).to.be.greaterThan(0);
        expect(body.estimatedIncrementalSize).to.be.greaterThan(0);
        expect(body.diskSpaceUsedPct).to.be.greaterThan(0);
        expect(body.dailyDataGeneration).to.be.greaterThan(0);
      });

      it('returns empty summary stats when there is no matching lifecycle phase', async () => {
        const { status, body } = await callApi({
          query: {
            indexLifecyclePhase: IndexLifecyclePhaseSelectOption.Warm,
          },
        });

        expect(status).to.be(200);
        expect(body.tracesPerMinute).to.be(0);
        expect(body.numberOfServices).to.be(0);
        expect(body.totalSize).to.be.greaterThan(0);
        expect(body.estimatedIncrementalSize).to.be(0);
        expect(body.diskSpaceUsedPct).to.be.greaterThan(0);
        expect(body.dailyDataGeneration).to.be(0);
      });

      it('returns only go service summary stats when there is a matching kql filter', async () => {
        const { status, body } = await callApi({
          query: {
            kuery: `service.name : ${goServiceName}`,
          },
        });

        expect(status).to.be(200);
        expect(body.numberOfServices).to.be(1);
        expect(roundNumber(body.tracesPerMinute)).to.be(1);
        expect(body.totalSize).to.be.greaterThan(0);
        expect(body.estimatedIncrementalSize).to.be.greaterThan(0);
        expect(body.diskSpaceUsedPct).to.be.greaterThan(0);
        expect(body.dailyDataGeneration).to.be.greaterThan(0);
      });
    });
  });
}
