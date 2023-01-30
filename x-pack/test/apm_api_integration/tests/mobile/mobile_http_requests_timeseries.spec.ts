/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateMobileData } from './generate_mobile_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T02:00:00.000Z').getTime();

  async function getHttpRequestsChart({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    transactionType = 'mobile',
    offset,
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    transactionType?: string;
    offset?: string;
  }) {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests',
      params: {
        path: { serviceName },
        query: {
          environment,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          kuery,
          transactionType,
          offset,
        },
      },
    });
  }

  registry.when(
    'Mobile HTTP requests without data loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when no data', () => {
        it('handles empty state', async () => {
          const response = await getHttpRequestsChart({ serviceName: 'foo' });
          expect(response.body.currentPeriod.timeseries).to.eql([]);
          expect(response.body.previousPeriod.timeseries).to.eql([]);
          expect(response.status).to.be(200);
        });
      });
    }
  );

  registry.when('Mobile HTTP requests with data loaded', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateMobileData({
        synthtraceEsClient,
        start,
        end,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe('when data is loaded', () => {
      it('returns timeseries for http requests chart', async () => {
        const response = await getHttpRequestsChart({ serviceName: 'synth-android', offset: '1d' });

        expect(response.status).to.be(200);
        expect(response.body.currentPeriod.timeseries.some((item) => item.x && item.y)).to.eql(
          true
        );
        expect(response.body.previousPeriod.timeseries[0].y).to.eql(0);
      });

      it('returns only current period timeseries when offset is not available', async () => {
        const response = await getHttpRequestsChart({ serviceName: 'synth-android' });

        expect(response.status).to.be(200);
        expect(
          response.body.currentPeriod.timeseries.some((item) => item.y === 0 && item.x)
        ).to.eql(true);

        expect(response.body.currentPeriod.timeseries[0].y).to.eql(1);
        expect(response.body.previousPeriod.timeseries).to.eql([]);
      });
    });

    describe('when filters are applied', () => {
      it('returns empty state for filters', async () => {
        const response = await getHttpRequestsChart({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `app.version:"none"`,
        });

        expect(response.status).to.be(200);
        expect(response.body.currentPeriod.timeseries.every((item) => item.y === 0)).to.eql(true);
        expect(response.body.previousPeriod.timeseries.every((item) => item.y === 0)).to.eql(true);
      });

      it('returns the correct values when filter is applied', async () => {
        const response = await getHttpRequestsChart({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `network.connection.type:"wifi"`,
        });

        const ntcCell = await getHttpRequestsChart({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `network.connection.type:"cell"`,
        });

        expect(response.status).to.be(200);
        expect(ntcCell.status).to.be(200);
        expect(response.body.currentPeriod.timeseries[0].y).to.eql(0);
        expect(ntcCell.body.currentPeriod.timeseries[0].y).to.eql(0);
      });
    });
  });
}
