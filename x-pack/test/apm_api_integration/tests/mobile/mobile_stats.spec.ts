/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { sumBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateMobileData } from './generate_mobile_data';

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
        const response = await getMobileStats({ serviceName: 'foo' });
        expect(
          response.currentPeriod.sessions.timeseries.every(
            (item: { x: number; y?: number | null }) => item.y === 0
          )
        ).to.eql(true);
        expect(
          response.currentPeriod.requests.timeseries.every(
            (item: { x: number; y?: number | null }) => item.y === 0
          )
        ).to.eql(true);
      });
    });
  });

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
      let response: MobileStats;

      before(async () => {
        response = await getMobileStats({
          serviceName: 'synth-android',
          environment: 'production',
        });
      });

      it('returns same sessions', () => {
        const { value, timeseries } = response.currentPeriod.sessions;
        const timeseriesTotal = sumBy(timeseries, 'y');
        expect(value).to.be(timeseriesTotal);
      });

      it('returns same requests', () => {
        const { value, timeseries } = response.currentPeriod.requests;
        const timeseriesTotal = sumBy(timeseries, 'y');
        expect(value).to.be(timeseriesTotal);
      });
    });

    describe('when filters are applied', () => {
      it('returns empty state for filters', async () => {
        const response = await getMobileStats({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `app.version:"none"`,
        });

        expect(response.currentPeriod.sessions.value).to.eql(0);
        expect(response.currentPeriod.requests.value).to.eql(0);

        expect(
          response.currentPeriod.sessions.timeseries.every(
            (item: { x: number; y?: number | null }) => item.y === 0
          )
        ).to.eql(true);
        expect(
          response.currentPeriod.requests.timeseries.every(
            (item: { x: number; y?: number | null }) => item.y === 0
          )
        ).to.eql(true);
      });

      it('returns the correct values when single filter is applied', async () => {
        const response = await getMobileStats({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `service.version:"1.0"`,
        });

        expect(response.currentPeriod.sessions.value).to.eql(6);
        expect(response.currentPeriod.requests.value).to.eql(0);
      });

      it('returns the correct values when multiple filters are applied', async () => {
        const response = await getMobileStats({
          serviceName: 'synth-android',
          kuery: `service.version:"1.0" and service.environment: "production"`,
        });

        expect(response.currentPeriod.sessions.value).to.eql(6);
        expect(response.currentPeriod.requests.value).to.eql(0);
      });
    });
  });
}
