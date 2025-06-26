/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');

  const start = '2021-10-01T00:00:00.000Z';
  const end = '2021-10-01T01:00:00.000Z';

  const serviceNames = ['opbeans-java', 'opbeans-go'];

  describe('Services detailed statistics', () => {
    describe('Services detailed statistics when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `POST /internal/apm/services/detailed_statistics`,
          params: {
            query: {
              start,
              end,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
              offset: '1d',
              probability: 1,
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              bucketSizeInSeconds: 60,
            },
            body: {
              serviceNames: JSON.stringify(serviceNames),
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.currentPeriod).to.be.empty();
        expect(response.body.previousPeriod).to.be.empty();
      });
    });
  });
}
