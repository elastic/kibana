/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateMobileData } from './generate_mobile_data';

type MostUsedCharts =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/most_used_charts'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileMostUsedCharts({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    transactionType = 'mobile',
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    transactionType?: string;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/most_used_charts',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            transactionType,
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when(
    'Most used charts when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when no data', () => {
        it('handles empty state', async () => {
          const response: MostUsedCharts = await getMobileMostUsedCharts({ serviceName: 'foo' });
          expect(response.mostUsedCharts.length).to.eql(4);
          expect(response.mostUsedCharts.every((chart) => chart.options.length === 0)).to.eql(true);
        });
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177394
  registry.when('Mobile stats', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateMobileData({
        synthtraceEsClient,
        start,
        end,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe('when data is loaded', () => {
      let response: MostUsedCharts;

      before(async () => {
        response = await getMobileMostUsedCharts({
          serviceName: 'synth-android',
          environment: 'production',
        });
      });

      it('should get the top 5 and the other option only', () => {
        const deviceOptions = response.mostUsedCharts.find(
          (chart) => chart.key === 'device'
        )?.options;
        expect(deviceOptions?.length).to.eql(6);
        expect(deviceOptions?.find((option) => option.key === 'other')).to.not.be(undefined);
      });

      it('should get network connection type object from span events', () => {
        const nctOptions = response.mostUsedCharts.find(
          (chart) => chart.key === 'netConnectionType'
        )?.options;
        expect(nctOptions?.length).to.eql(2);
      });
    });
  });
}
