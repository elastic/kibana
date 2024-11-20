/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { generateMobileData } from './generate_mobile_data';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');

  const synthtrace = getService('synthtrace');
  let apmSynthtraceEsClient: ApmSynthtraceEsClient;

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T02:00:00.000Z').getTime();

  async function getSessionsChart({
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
      endpoint: 'GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions',
      params: {
        path: { serviceName },
        query: {
          environment,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          offset,
          kuery,
          transactionType,
        },
      },
    });
  }

  describe('Sessions charts', () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await getSessionsChart({ serviceName: 'foo' });
        expect(response.body.currentPeriod.timeseries).to.eql([]);
        expect(response.body.previousPeriod.timeseries).to.eql([]);
        expect(response.status).to.be(200);
      });
    });

    describe('with data loaded', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await generateMobileData({
          apmSynthtraceEsClient,
          start,
          end,
        });
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('when data is loaded', () => {
        it('returns timeseries for sessions chart', async () => {
          const response = await getSessionsChart({ serviceName: 'synth-android', offset: '1d' });

          expect(response.status).to.be(200);
          expect(response.body.currentPeriod.timeseries.some((item) => item.x && item.y)).to.eql(
            true
          );

          expect(response.body.currentPeriod.timeseries[0].y).to.eql(6);
          expect(response.body.previousPeriod.timeseries[0].y).to.eql(0);
        });

        it('returns only current period timeseries when offset is not available', async () => {
          const response = await getSessionsChart({ serviceName: 'synth-android' });

          expect(response.status).to.be(200);
          expect(response.body.currentPeriod.timeseries.some((item) => item.x && item.y)).to.eql(
            true
          );

          expect(response.body.currentPeriod.timeseries[0].y).to.eql(6);
          expect(response.body.previousPeriod.timeseries).to.eql([]);
        });
      });

      describe('when filters are applied', () => {
        it('returns empty state for filters', async () => {
          const response = await getSessionsChart({
            serviceName: 'synth-android',
            environment: 'production',
            kuery: `app.version:"none"`,
          });

          expect(response.body.currentPeriod.timeseries.every((item) => item.y === 0)).to.eql(true);
          expect(response.body.previousPeriod.timeseries.every((item) => item.y === 0)).to.eql(
            true
          );
        });

        it('returns the correct values filter is applied', async () => {
          const response = await getSessionsChart({
            serviceName: 'synth-android',
            environment: 'production',
            kuery: `transaction.name : "Start View - View Appearing"`,
          });

          expect(response.status).to.be(200);
          expect(response.body.currentPeriod.timeseries.some((item) => item.x && item.y)).to.eql(
            true
          );

          expect(response.body.currentPeriod.timeseries[0].y).to.eql(6);
          expect(response.body.previousPeriod.timeseries).to.eql([]);
        });
      });
    });
  });
}
