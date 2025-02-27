/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LatencyDistributionChartType } from '@kbn/apm-plugin/common/latency_distribution_chart_types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');
  const endpoint = 'POST /internal/apm/latency/overall_distribution/transactions';

  // This matches the parameters used for the other tab's search strategy approach in `../correlations/*`.
  const getOptions = () => ({
    params: {
      body: {
        environment: 'ENVIRONMENT_ALL',
        start: '2020',
        end: '2021',
        kuery: '',
        percentileThreshold: 95,
        chartType: LatencyDistributionChartType.transactionLatency,
      },
    },
  });

  describe('Latency overall distribution', () => {
    describe('without data', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.be(200);
        expect(response.body?.percentileThresholdValue).to.be(undefined);
        expect(response.body?.overallHistogram?.length).to.be(undefined);
      });
    });

    describe('with data and default args', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES['8.0.0']);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES['8.0.0']);
      });

      // This uses the same archive used for the other tab's search strategy approach in `../correlations/*`.
      it('returns percentileThresholdValue and overall histogram', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.eql(200);
        // This matches the values returned for the other tab's search strategy approach in `../correlations/*`.
        expect(response.body?.percentileThresholdValue).to.be(1309695.875);
        expect(response.body?.overallHistogram?.length).to.be(101);
      });
    });
  });
}
