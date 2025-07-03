/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SynthtraceFixture } from '@kbn/scout-oblt';
import { apm, log, timerange } from '@kbn/apm-synthtrace-client';

const TEST_START_TIME = '2024-01-01T00:00:00.000Z';
const TEST_END_TIME = '2024-01-01T01:00:00.000Z';

/**
 * Generate synthetic logs data for testing
 */
export async function generateLogsData(
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient']
) {
  const logsData = timerange(TEST_START_TIME, TEST_END_TIME)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message('Test log message')
        .timestamp(timestamp)
        .dataset('synth.test')
        .namespace('default')
        .logLevel(Math.random() > 0.5 ? 'info' : 'warn')
        .defaults({
          'service.name': 'test-service',
        })
    );

  await logsSynthtraceEsClient.index(logsData);
}

/**
 * Generate synthetic APM data for testing
 */
export async function generateApmData(
  apmSynthtraceEsClient: SynthtraceFixture['apmSynthtraceEsClient']
) {
  const apmData = timerange(TEST_START_TIME, TEST_END_TIME)
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

  await apmSynthtraceEsClient.index(apmData);
}
