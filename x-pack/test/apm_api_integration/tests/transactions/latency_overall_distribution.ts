/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');

  const endpoint = 'GET /internal/apm/latency/overall_distribution';

  // This matches the parameters used for the other tab's search strategy approach in `../correlations/*`.
  const getOptions = () => ({
    params: {
      query: {
        environment: 'ENVIRONMENT_ALL',
        start: '2020',
        end: '2021',
        kuery: '',
        percentileThreshold: '95',
      },
    },
  });

  registry.when(
    'latency overall distribution without data',
    { config: 'trial', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.be(200);
        expect(response.body?.percentileThresholdValue).to.be(undefined);
        expect(response.body?.overallHistogram?.length).to.be(undefined);
      });
    }
  );

  registry.when(
    'latency overall distribution with data and default args',
    // This uses the same archive used for the other tab's search strategy approach in `../correlations/*`.
    { config: 'trial', archives: ['8.0.0'] },
    () => {
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
    }
  );
}
