/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';

async function generateData({
  synthtraceEsClient,
  start,
  end,
  type,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
  type: 'transaction' | 'error' | 'metric';
}) {
  const serviceName = 'synth-go';
  const serviceGoProdInstance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'go' })
    .instance('instance-a');

  const metricOnlyInstance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'java' })
    .instance('metric-only-production');

  const transactionNameProductList = 'GET /api/product/list';

  switch (type) {
    case 'transaction':
      await synthtraceEsClient.index(
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            serviceGoProdInstance
              .transaction({ transactionName: transactionNameProductList })
              .timestamp(timestamp)
              .duration(1000)
              .success()
          )
      );
      break;
    case 'error':
      await synthtraceEsClient.index(
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            serviceGoProdInstance
              .transaction({ transactionName: transactionNameProductList })
              .timestamp(timestamp)
              .duration(1000)
              .failure()
          )
      );
      break;
    case 'metric':
      await synthtraceEsClient.index(
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            metricOnlyInstance
              .appMetrics({
                'system.memory.actual.free': 1,
                'system.cpu.total.norm.pct': 1,
                'system.memory.total': 1,
                'system.process.cpu.total.norm.pct': 1,
              })
              .timestamp(timestamp)
          )
      );
  }
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2023-06-06T21:00:00.000Z').getTime();
  const end = new Date('2023-06-06T22:00:00.000Z').getTime();

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/agent_status',
    });
  }

  registry.when(
    'Agent status check when no data is present',
    { config: 'basic', archives: [] },
    () => {
      it('should return false', async () => {
        const response = await callApi();

        expect(response.status).to.be(200);
        expect(response.body.status).to.be(false);
      });
    }
  );

  registry.when(
    'Agent status check when data is present',
    { config: 'basic', archives: [] },
    () => {
      describe('when only success transactions are present', () => {
        before(async () => {
          await generateData({
            synthtraceEsClient,
            start,
            end,
            type: 'transaction',
          });
        });
        after(() => synthtraceEsClient.clean());
        it('should return true when transactions are present', async () => {
          const response = await callApi();

          expect(response.status).to.be(200);
          expect(response.body.status).to.be(true);
        });
      });

      describe('when only errors are present', () => {
        before(async () => {
          await generateData({
            synthtraceEsClient,
            start,
            end,
            type: 'error',
          });
        });
        after(() => synthtraceEsClient.clean());
        it('should return true when errors are present', async () => {
          const response = await callApi();

          expect(response.status).to.be(200);
          expect(response.body.status).to.be(true);
        });
      });

      describe('when only metrics are present', () => {
        before(async () => {
          await generateData({
            synthtraceEsClient,
            start,
            end,
            type: 'metric',
          });
        });
        after(() => synthtraceEsClient.clean());
        it('should return true when only metrics are present', async () => {
          const response = await callApi();

          expect(response.status).to.be(200);
          expect(response.body.status).to.be(true);
        });
      });
    }
  );
}
