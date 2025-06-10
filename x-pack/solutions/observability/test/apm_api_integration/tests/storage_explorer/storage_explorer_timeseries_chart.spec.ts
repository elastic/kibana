/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { sumBy } from 'lodash';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { IndexLifecyclePhaseSelectOption } from '@kbn/apm-plugin/common/storage_explorer_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type StorageTimeSeries = APIReturnType<'GET /internal/apm/storage_chart'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi() {
    return await apmApiClient.monitorClusterAndIndicesUser({
      endpoint: 'GET /internal/apm/storage_chart',
      params: {
        query: {
          indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
          probability: 1,
          environment: 'ENVIRONMENT_ALL',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          kuery: '',
        },
      },
    });
  }

  registry.when(
    'Storage Explorer timeseries chart when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.storageTimeSeries).to.empty();
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177539
  registry.when('Storage Explorer timeseries chart', { config: 'basic', archives: [] }, () => {
    describe('when data is loaded', () => {
      let body: StorageTimeSeries;
      let status: number;

      before(async () => {
        const serviceGo1 = apm
          .service({ name: 'synth-go-1', environment: 'production', agentName: 'go' })
          .instance('instance');
        const serviceGo2 = apm
          .service({ name: 'synth-go-2', environment: 'production', agentName: 'go' })
          .instance('instance');

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceGo1
                .transaction({ transactionName: 'GET /api/product/list1' })
                .duration(2000)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceGo2
                .transaction({ transactionName: 'GET /api/product/list2' })
                .duration(2000)
                .timestamp(timestamp)
            ),
        ]);

        const response = await callApi();
        body = response.body;
        status = response.status;
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns correct HTTP status', async () => {
        expect(status).to.be(200);
      });

      it('returns timeseries for each service', () => {
        expect(body.storageTimeSeries).to.have.length(2);
        body.storageTimeSeries.forEach((serie) => {
          expect(serie).to.have.property('timeseries');
          expect(serie.timeseries).to.have.length(15);
        });
      });

      it('has the same size for both services', () => {
        const [first, second] = body.storageTimeSeries;
        expect(sumBy(first.timeseries, 'y')).to.be(sumBy(second.timeseries, 'y'));
      });
    });
  });
}
