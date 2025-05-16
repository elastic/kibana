/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = '2023-10-28T00:00:00.000Z';
  const end = '2023-10-28T00:14:59.999Z';

  const serviceName = 'opbeans-node';

  async function getTransactionTypes() {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/transaction_types',
      params: {
        path: { serviceName },
        query: {
          start,
          end,
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
        },
      },
    });

    return response;
  }

  describe('Transaction types', () => {
    describe('when data is not loaded', () => {
      it('handles empty state', async () => {
        const response = await getTransactionTypes();

        expect(response.status).to.be(200);

        expect(response.body.transactionTypes.length).to.be(0);
      });
    });

    describe('when data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        const interval = timerange(new Date(start).getTime(), new Date(end).getTime() - 1).interval(
          '1m'
        );

        const instance = apm.service(serviceName, 'production', 'node').instance('instance');

        await apmSynthtraceEsClient.index([
          interval.rate(3).generator((timestamp) => {
            return instance
              .transaction({ transactionName: 'GET /api', transactionType: 'request' })
              .duration(1000)
              .outcome('success')
              .timestamp(timestamp);
          }),
          interval.rate(1).generator((timestamp) => {
            return instance
              .transaction({ transactionName: 'rm -rf *', transactionType: 'worker' })
              .duration(100)
              .outcome('failure')
              .timestamp(timestamp);
          }),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());
      it('displays available tx types', async () => {
        const response = await getTransactionTypes();

        expect(response.status).to.be(200);
        expect(response.body.transactionTypes.length).to.be.greaterThan(0);

        expect(response.body.transactionTypes).to.eql(['request', 'worker']);
      });
    });
  });
}
