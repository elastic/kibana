/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, InfraDocument, LogDocument } from '@kbn/synthtrace-client';
import type { SynthtraceEsClient } from '@kbn/synthtrace/src/lib/shared/base_client';
import { apm, infra, log, timerange } from '@kbn/synthtrace-client';

export const TEST_START_DATE = '2024-01-01T00:00:00.000Z';
export const TEST_END_DATE = '2024-01-01T01:00:00.000Z';

/**
 * Generate synthetic logs data for testing
 */
export async function generateLogsData({
  from,
  to,
  client,
  opts,
}: {
  from: number;
  to: number;
  client: Pick<SynthtraceEsClient<LogDocument>, 'index'>;
  opts?: { dataset?: string };
}): Promise<void> {
  const range = timerange(from, to);

  const generator = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message('Test log message')
        .timestamp(timestamp)
        .dataset(opts?.dataset ?? 'synth.test')
        .namespace('default')
        .logLevel(Math.random() > 0.5 ? 'info' : 'warn')
        .defaults({
          'service.name': 'test-service',
        })
    );

  await client.index(generator);
}

/**
 * Generate synthetic APM data for testing
 */
export async function generateApmData({
  from,
  to,
  client,
}: {
  from: number;
  to: number;
  client: Pick<SynthtraceEsClient<ApmFields>, 'index'>;
}): Promise<void> {
  const range = timerange(from, to);

  const generator = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      apm
        .service({ name: 'test-service-1', environment: 'test', agentName: 'nodejs' })
        .instance('instance-1')
        .transaction({ transactionName: 'GET /api/test' })
        .timestamp(timestamp)
        .duration(100)
        .success()
    );

  await client.index(generator);
}

/**
 * Generate synthetic metrics data for testing
 */
export async function generateMetricsData({
  from,
  to,
  client,
  metricName = 'system.diskio.write.bytes',
  hostName = 'test-host',
}: {
  from: number;
  to: number;
  client: Pick<SynthtraceEsClient<InfraDocument>, 'index'>;
  metricName?: string;
  hostName?: string;
  cpuValue?: number;
  memoryUsedPct?: number;
}): Promise<void> {
  const range = timerange(from, to);

  const THRESHOLD = 48 * 1024 * 1024; // 48MB
  const distributionPattern = [
    THRESHOLD - 1_000_000, // < 48M (47M approx)
    THRESHOLD - 500_000, // < 48M (47.5M approx)
    THRESHOLD + 1_000_000, // > 48M (49M approx)
  ];

  let index = 0;

  const generator = range
    .interval('30s')
    .rate(1)
    .generator((timestamp) => {
      const writeBytes = distributionPattern[index % distributionPattern.length];
      index++;

      return [
        infra
          .host(hostName)
          .diskio({
            [metricName]: writeBytes,
          })
          .timestamp(timestamp),
      ];
    });

  await client.index(generator);
}
