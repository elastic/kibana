/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');

  const endpoint = 'POST /internal/apm/correlations/p_values';

  const getOptions = () => ({
    params: {
      body: {
        environment: 'ENVIRONMENT_ALL',
        start: '2020',
        end: '2021',
        kuery: '',
        fieldCandidates: [
          'service.version',
          'service.node.name',
          'service.framework.version',
          'service.language.version',
          'service.runtime.version',
          'kubernetes.pod.name',
          'kubernetes.pod.uid',
          'container.id',
          'source.ip',
          'client.ip',
          'host.ip',
          'service.environment',
          'process.args',
          'http.response.status_code',
        ],
      },
    },
  });

  registry.when('p values without data', { config: 'trial', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await apmApiClient.readUser({
        endpoint,
        ...getOptions(),
      });

      expect(response.status).to.be(200);
      expect(response.body?.failedTransactionsCorrelations.length).to.be(0);
    });
  });

  registry.when(
    'p values with data and default args',
    { config: 'trial', archives: ['8.0.0'] },
    () => {
      it('returns p values', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.eql(200);
        expect(response.body?.failedTransactionsCorrelations.length).to.be(15);
      });
    }
  );
}
