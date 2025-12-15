/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type moment from 'moment';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export const createSyntheticApmDataWithAnomalies = async ({
  getService,
  apmSynthtraceEsClient,
  serviceName,
  environment,
  language,
  start,
  end,
  spikeStart,
  spikeEnd,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  serviceName: string;
  environment: string;
  language: string;
  start: moment.Moment;
  end: moment.Moment;
  spikeStart: number;
  spikeEnd: number;
}) => {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const ml = getService('ml');

  await Promise.all([apmSynthtraceEsClient.clean(), ml.api.cleanMlIndices(), ,]);
  await ml.api.deleteAllAnomalyDetectionJobs();

  const service = apm
    .service({ name: serviceName, environment, agentName: language })
    .instance('instance-01');

  await apmSynthtraceEsClient.index(
    timerange(start, end)
      .interval('1m')
      .rate(10)
      .generator((timestamp) => {
        const isSpike = timestamp >= spikeStart && timestamp <= spikeEnd;
        const traceDuration = isSpike ? 8000 : 200;
        // Introduce failures during the spike
        const outcome = isSpike && timestamp % 10 === 0 ? 'failure' : 'success';

        const docs = [
          service
            .transaction('POST /api/checkout', 'request')
            .timestamp(timestamp)
            .duration(traceDuration)
            .outcome(outcome),

          // create some overlapping transactions to simulate real world load
          service
            .transaction('GET /api/cart', 'request')
            .timestamp(timestamp + 50)
            .duration(traceDuration * 0.5)
            .outcome('success'),
        ];

        if (isSpike) {
          // Add extra traffic during spike with failures
          docs.push(
            service
              .transaction('POST /api/checkout', 'request')
              .timestamp(timestamp + 100)
              .duration(traceDuration * 1.2)
              .outcome('failure')
          );
        }

        return docs;
      })
  );

  // Create anomaly detection job
  const editorClient = await roleScopedSupertest.getSupertestWithRoleScope('editor', {
    withInternalHeaders: true,
    useCookieHeader: true,
  });

  await editorClient
    .post('/internal/apm/settings/anomaly-detection/jobs')
    .send({ environments: [environment] })
    .expect(200);
};
