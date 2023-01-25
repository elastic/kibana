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

type MobileLocationStats =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/location/stats'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileLocationStats({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    transactionType = 'mobile',
    locationField = 'client.geo.country_name',
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    transactionType?: string;
    locationField?: string;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/location/stats',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            transactionType,
            locationField,
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when('Location stats when data is not loaded', { config: 'basic', archives: [] }, () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await getMobileLocationStats({ serviceName: 'foo' });
        expect(response.currentPeriod.mostSessions.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
        expect(response.currentPeriod.mostRequests.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
      });
    });
  });

  registry.when('Location stats', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateMobileData({
        synthtraceEsClient,
        start,
        end,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe('when data is loaded', () => {
      let response: MobileLocationStats;

      before(async () => {
        response = await getMobileLocationStats({
          serviceName: 'synth-android',
          environment: 'production',
        });
      });

      it('returns location for most sessions', () => {
        const { location } = response.currentPeriod.mostSessions;
        expect(location).to.be('China');
      });

      it('returns location for most requests', () => {
        const { location } = response.currentPeriod.mostRequests;
        expect(location).to.be('China');
      });
    });

    describe('when filters are applied', () => {
      it('returns empty state for filters', async () => {
        const response = await getMobileLocationStats({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `app.version:"none"`,
        });

        expect(response.currentPeriod.mostSessions.value).to.eql(0);
        expect(response.currentPeriod.mostRequests.value).to.eql(0);

        expect(response.currentPeriod.mostSessions.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
        expect(response.currentPeriod.mostRequests.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
      });

      it('returns the correct values when single filter is applied', async () => {
        const response = await getMobileLocationStats({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `service.version:"1.0"`,
        });

        expect(response.currentPeriod.mostSessions.value).to.eql(6);
        expect(response.currentPeriod.mostRequests.value).to.eql(0);
      });

      it('returns the correct values when multiple filters are applied', async () => {
        const response = await getMobileLocationStats({
          serviceName: 'synth-android',
          kuery: `service.version:"1.0" and service.environment: "production"`,
        });

        expect(response.currentPeriod.mostSessions.value).to.eql(6);
        expect(response.currentPeriod.mostRequests.value).to.eql(0);
      });
    });
  });
}
