/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { IndexLifecyclePhaseSelectOption } from '@kbn/apm-plugin/common/storage_explorer_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  APIReturnType,
  APIClientRequestParamsOf,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { keyBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type StorageDetails = APIReturnType<'GET /internal/apm/services/{serviceName}/storage_details'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const serviceName = 'opbeans-go';

  function areProcessorEventStatsEmpty(storageDetails: StorageDetails) {
    return storageDetails.processorEventStats.every(({ docs, size }) => docs === 0 && size === 0);
  }

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/storage_details'>['params']
    >
  ) {
    return await apmApiClient.monitorClusterAndIndicesUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/storage_details',
      params: {
        path: {
          serviceName,
          ...overrides?.path,
        },
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
    'Storage details when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.processorEventStats).to.have.length(4);
        expect(areProcessorEventStatsEmpty(body)).to.be(true);
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/144025
  registry.when.skip('Storage details', { config: 'basic', archives: [] }, () => {
    describe.skip('when data is loaded', () => {
      before(async () => {
        const serviceGo = apm
          .service({ name: serviceName, environment: 'production', agentName: 'go' })
          .instance('instance');

        await synthtraceEsClient.index([
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceGo
                .transaction({ transactionName: 'GET /api/product/list' })
                .duration(2000)
                .timestamp(timestamp)
                .children(
                  serviceGo
                    .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
                    .destination('elasticsearch')
                    .duration(100)
                    .success()
                    .timestamp(timestamp),
                  serviceGo
                    .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
                    .destination('elasticsearch')
                    .duration(300)
                    .success()
                    .timestamp(timestamp)
                )
                .errors(
                  serviceGo.error({ message: 'error 1', type: 'foo' }).timestamp(timestamp),
                  serviceGo.error({ message: 'error 2', type: 'foo' }).timestamp(timestamp),
                  serviceGo.error({ message: 'error 3', type: 'bar' }).timestamp(timestamp)
                )
            ),
        ]);
      });

      after(() => synthtraceEsClient.clean());

      it('returns correct stats for processor events', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);
        expect(body.processorEventStats).to.have.length(4);

        const stats = keyBy(body.processorEventStats, 'processorEvent');

        expect(stats[ProcessorEvent.transaction]?.docs).to.be(3);
        expect(stats[ProcessorEvent.transaction]?.size).to.be.greaterThan(0);
        expect(stats[ProcessorEvent.span]?.docs).to.be(6);
        expect(stats[ProcessorEvent.span]?.size).to.be.greaterThan(0);
        expect(stats[ProcessorEvent.error]?.docs).to.be(9);
        expect(stats[ProcessorEvent.error]?.size).to.be.greaterThan(0);
        expect(stats[ProcessorEvent.metric]?.docs).to.be.greaterThan(0);
        expect(stats[ProcessorEvent.metric]?.size).to.be.greaterThan(0);
      });

      it('returns empty stats when there is no matching environment', async () => {
        const { status, body } = await callApi({
          query: {
            environment: 'test',
          },
        });
        expect(status).to.be(200);
        expect(areProcessorEventStatsEmpty(body)).to.be(true);
      });

      it('returns empty stats when there is no matching lifecycle phase', async () => {
        const { status, body } = await callApi({
          query: {
            indexLifecyclePhase: IndexLifecyclePhaseSelectOption.Warm,
          },
        });
        expect(status).to.be(200);
        expect(areProcessorEventStatsEmpty(body)).to.be(true);
      });

      it('returns empty stats when there is no matching kql filter', async () => {
        const { status, body } = await callApi({
          query: {
            kuery: 'service.name : opbeans-node',
          },
        });
        expect(status).to.be(200);
        expect(areProcessorEventStatsEmpty(body)).to.be(true);
      });
    });
  });
}
