/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { generateShortId, log, timerange } from '@kbn/apm-synthtrace-client';

const DATASET = 'payments.api';
const SERVICE_NAME = 'payments-service';
const BASE_DOCS_PER_STEP = 10;
const SPIKE_DOCS_PER_STEP = 110;

export const LOG_RATE_ANALYSIS_SPIKE_BASELINE_WINDOW = {
  from: 'now-60m',
  to: 'now-20m',
} as const;

export const LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW = {
  from: 'now-20m',
  to: 'now',
} as const;

export const LOG_RATE_ANALYSIS_SPIKE_DATA_STREAM = `logs-${DATASET}-default`;

/**
 * Creates a spike-pattern log dataset that mirrors the upstream
 * log rate analysis scenario. The dataset emits steady baseline
 * logs and introduces a flood of timeout errors in the last
 * 20 minutes of the range so the tool can attribute the spike.
 */
export async function createLogRateAnalysisSpikeData({
  logsSynthtraceEsClient,
}: {
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
}) {
  const range = timerange(
    LOG_RATE_ANALYSIS_SPIKE_BASELINE_WINDOW.from,
    LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.to
  );

  const spikeStart = datemath.parse(LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.from)!.valueOf();
  const spikeEnd = datemath.parse(LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.to)!.valueOf();

  await logsSynthtraceEsClient.clean();

  const logStream = range
    .interval('30s')
    .rate(1)
    .generator((timestamp, index) => {
      const tenantId = index % 2 === 0 ? 'acme-bank' : 'omega-shop';
      const provider = index % 2 === 0 ? 'adyen-edge' : 'worldpay-plus';
      const region = index % 10 === 0 ? 'us-east-1' : 'us-west-2';
      const baseMessage = `PAYMENT_RESPONSE tenant=${tenantId} outcome=OK`;
      const spikeMessage = `PAYMENT_TIMEOUT tenant=${tenantId} provider=${provider} status=504 reason=gateway_timeout`;

      const baseDocs = Array.from({ length: BASE_DOCS_PER_STEP }, () =>
        log
          .create()
          .dataset(DATASET)
          .service(SERVICE_NAME)
          .message(baseMessage)
          .logLevel('info')
          .defaults({
            'service.environment': 'production',
            'event.dataset': DATASET,
            'event.category': 'application',
            'http.request.method': 'POST',
            'cloud.region': region,
            'client.ip': '10.8.0.10',
            'error.message': baseMessage,
            'trace.id': generateShortId(),
            'http.response.status_code': 200,
          })
          .timestamp(timestamp)
      );

      const isSpike = timestamp >= spikeStart && timestamp <= spikeEnd;

      const spikeDocs = isSpike
        ? Array.from({ length: SPIKE_DOCS_PER_STEP }, () =>
            log
              .create()
              .dataset(DATASET)
              .service(SERVICE_NAME)
              .message(spikeMessage)
              .logLevel('error')
              .defaults({
                'service.environment': 'production',
                'event.dataset': DATASET,
                'event.category': 'application',
                'http.request.method': 'POST',
                'cloud.region': region,
                'client.ip': '10.8.0.10',
                'error.message': spikeMessage,
                'trace.id': generateShortId(),
                'http.response.status_code': 500,
              })
              .timestamp(timestamp)
          )
        : [];

      return [...baseDocs, ...spikeDocs];
    });

  await logsSynthtraceEsClient.index([logStream]);
}
