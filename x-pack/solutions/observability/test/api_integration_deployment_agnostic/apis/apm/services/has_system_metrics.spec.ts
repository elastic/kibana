/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { ENVIRONMENT_ALL_VALUE } from '@kbn/apm-plugin/common/environment_filter_values';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const start = new Date('2024-01-01T00:00:00.000Z').getTime();
const end = new Date('2024-01-01T00:15:00.000Z').getTime() - 1;
const startIso = new Date(start).toISOString();
const endIso = new Date(end).toISOString();

const serviceName = 'synth-has-system-metrics';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  async function getHasSystemMetrics(environment = ENVIRONMENT_ALL_VALUE) {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/has_system_metrics',
      params: {
        path: { serviceName },
        query: { start: startIso, end: endIso, environment },
      },
    });
  }

  describe('has_system_metrics', () => {
    describe('when there is no data', () => {
      it('returns false', async () => {
        const { status, body } = await getHasSystemMetrics();
        expect(status).to.be(200);
        expect(body.hasSystemMetrics).to.be(false);
      });
    });

    describe('when only APM transaction data exists (no system metrics)', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const instance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'java' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /api' })
                .timestamp(timestamp)
                .duration(100)
            )
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns false', async () => {
        const { status, body } = await getHasSystemMetrics();
        expect(status).to.be(200);
        expect(body.hasSystemMetrics).to.be(false);
      });
    });

    describe('when system metrics exist', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const instance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'java' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /api' })
                .timestamp(timestamp)
                .duration(100)
                .children(
                  instance
                    .span({ spanName: 'db query', spanType: 'db', spanSubtype: 'mysql' })
                    .timestamp(timestamp)
                    .duration(50)
                )
            )
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns 200', async () => {
        const { status } = await getHasSystemMetrics();
        expect(status).to.be(200);
      });
    });
  });
}
