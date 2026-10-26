/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ServiceAnomalies({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const dayInMs = 24 * 60 * 60 * 1000;
  const start = Date.now() - dayInMs;
  const end = Date.now() + dayInMs;
  const serviceName = 'synth-go-anomaly-api';

  async function getServiceAnomalyScore({
    name,
    environment,
  }: {
    name: string;
    environment: string;
  }) {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/anomaly_score',
      params: {
        path: { serviceName: name },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment,
        },
      },
    });
  }

  describe('Service anomaly score', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      const synthServices = [
        apm
          .service({ name: serviceName, environment: 'testing', agentName: 'go' })
          .instance('instance-1'),
      ];

      await apmSynthtraceEsClient.index(
        synthServices.map((service) =>
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              service
                .transaction({
                  transactionName: 'GET /api/health',
                  transactionType: 'request',
                })
                .duration(100)
                .timestamp(timestamp)
            )
        )
      );
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    it('returns 200 with {} or { anomalyScore: number } and no other keys', async () => {
      const response = await getServiceAnomalyScore({
        name: serviceName,
        environment: 'testing',
      });

      expect(response.status).to.be(200);
      expect(response.body).to.be.an('object');
      const keys = Object.keys(response.body);
      if (keys.length === 0) {
        expect(response.body).to.eql({});
      } else {
        expect(keys).to.eql(['anomalyScore']);
        expect(response.body.anomalyScore).to.be.a('number');
      }
    });

    it('returns 200 with an empty object when the service is unknown', async () => {
      const response = await getServiceAnomalyScore({
        name: 'no-such-service-for-anomaly-api-test',
        environment: 'ENVIRONMENT_ALL',
      });

      expect(response.status).to.be(200);
      expect(response.body).to.eql({});
    });
  });
}
