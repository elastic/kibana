/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/synthtrace-client';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const apmApiClient = getService('apmApiClient');

  const start = '2024-01-01T00:00:00.000Z';
  const end = '2024-01-01T01:00:00.000Z';

  async function hasSystemMetrics(serviceName: string, environment = 'ENVIRONMENT_ALL') {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/has_system_metrics',
      params: {
        path: { serviceName },
        query: { environment, start, end },
      },
    });
    return response.body.hasSystemMetrics;
  }

  registry.when('has_system_metrics', { config: 'basic', archives: [] }, () => {
    const serviceWithCpu = apm
      .service({ name: 'service-with-cpu', environment: 'production', agentName: 'java' })
      .instance('instance-1');

    const serviceWithMemory = apm
      .service({ name: 'service-with-memory', environment: 'production', agentName: 'java' })
      .instance('instance-1');

    const serviceTransactionOnly = apm
      .service({
        name: 'service-transaction-only',
        environment: 'production',
        agentName: 'opentelemetry/java',
      })
      .instance('instance-1');

    before(async () => {
      const range = timerange(new Date(start).getTime(), new Date(end).getTime())
        .interval('1m')
        .rate(1);

      await apmSynthtraceEsClient.index(
        range.generator((timestamp) => [
          serviceWithCpu
            .transaction({ transactionName: 'GET /api' })
            .duration(100)
            .timestamp(timestamp),
          serviceWithCpu.appMetrics({ 'system.cpu.total.norm.pct': 0.5 }).timestamp(timestamp),

          serviceWithMemory
            .transaction({ transactionName: 'GET /api' })
            .duration(100)
            .timestamp(timestamp),
          serviceWithMemory
            .appMetrics({
              'system.memory.actual.free': 512,
              'system.memory.total': 1024,
            })
            .timestamp(timestamp),

          serviceTransactionOnly
            .transaction({ transactionName: 'GET /api' })
            .duration(100)
            .timestamp(timestamp),
        ])
      );
    });

    after(() => apmSynthtraceEsClient.clean());

    it('returns true for a service with CPU metrics', async () => {
      expect(await hasSystemMetrics('service-with-cpu')).to.be(true);
    });

    it('returns true for a service with memory metrics', async () => {
      expect(await hasSystemMetrics('service-with-memory')).to.be(true);
    });

    it('returns false for a service with only transaction data', async () => {
      expect(await hasSystemMetrics('service-transaction-only')).to.be(false);
    });

    it('returns false when environment does not match', async () => {
      expect(await hasSystemMetrics('service-with-cpu', 'staging')).to.be(false);
    });

    it('returns false for a service that does not exist', async () => {
      expect(await hasSystemMetrics('non-existent-service')).to.be(false);
    });
  });
}
