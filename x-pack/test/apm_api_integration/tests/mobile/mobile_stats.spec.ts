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
import { sumBy } from 'lodash';

type MobileStats = APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/stats'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileStats({
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
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/stats',
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

  registry.when('Mobile stats when data is not loaded', { config: 'basic', archives: [] }, () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await callApi({ serviceName: 'test' });
        expect(response).to.eql({
          sessions: {
            timeseries: [],
            value: 0,
          },
          requests: {
            timeseries: [],
            value: 0,
          },
          maxLoadTime: {
            timeseries: [],
            value: null,
          },
          crashCount: {
            value: 0,
            timeseries: [],
          },
        });
      });
    });
  });

  registry.when('Mobile stats', { config: 'basic', archives: [] }, () => {
    before(async () => {
      generateMobileData({
        synthtraceEsClient,
        start,
        end,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe('when data is loaded', () => {
      let response: MobileStats;

      before(async () => {
        response = await getMobileStats({
          serviceName: 'synth-android',
          environment: 'production',
        });
      });

      it('returns same sessions', () => {
        const { value, timeseries } = response.sessions;
        const timeseriesTotal = sumBy(timeseries, 'y');
        expect(value).to.be(timeseriesTotal);
      });

      it('returns same crashCount', () => {
        const { value, timeseries } = response.crashCount;
        const timeseriesTotal = sumBy(timeseries, 'y');
        expect(value).to.be(timeseriesTotal);
      });

      it('returns same requests', () => {
        const { value, timeseries } = response.requests;
        const timeseriesTotal = sumBy(timeseries, 'y');
        expect(value).to.be(timeseriesTotal);
      });
    });
  });
}
