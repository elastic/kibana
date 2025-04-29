/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives from '../constants/archives_metadata';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];
  const transactionType = 'request';

  describe('Breakdown', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
          params: {
            path: { serviceName: 'opbeans-node' },
            query: {
              start,
              end,
              transactionType,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body).to.eql({ timeseries: [] });
      });
    });
  });
}
