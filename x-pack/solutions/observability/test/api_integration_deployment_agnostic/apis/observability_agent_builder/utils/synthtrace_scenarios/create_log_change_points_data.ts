/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { apm, log, timerange } from '@kbn/synthtrace-client';

const DATASET = 'app.logs';
const SERVICE_NAME = 'test-service';

export const LOG_CHANGE_POINTS_DATA_STREAM = `logs-${DATASET}-default`;
export const METRIC_CHANGE_POINTS_INDEX = `metrics-apm.app.${SERVICE_NAME}-default`;
export const CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
};
export const LOG_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-25m',
};
export const METRIC_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-28m',
};

/**
 * Creates log data with SPIKE pattern.
 */
export async function createLogChangePointsData({
  logsSynthtraceEsClient,
}: {
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
}) {
  const range = timerange(CHANGE_POINTS_ANALYSIS_WINDOW.start, CHANGE_POINTS_ANALYSIS_WINDOW.end);
  const spikeStart = datemath.parse(LOG_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(LOG_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.end)!.valueOf();

  const logStream = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp < spikeEnd;
      const logs = [];

      // Baseline normal logs
      for (let i = 0; i < 5; i++) {
        logs.push(
          log
            .create()
            .dataset(DATASET)
            .service(SERVICE_NAME)
            .message('Normal operation completed successfully')
            .logLevel('info')
            .timestamp(timestamp)
        );
      }

      const errorCount = isSpike ? 1000 : 5;
      for (let i = 0; i < errorCount; i++) {
        logs.push(
          log
            .create()
            .dataset(DATASET)
            .service(SERVICE_NAME)
            .message('Database connection error: timeout after 30000ms')
            .logLevel('error')
            .timestamp(timestamp)
        );
      }

      return logs;
    });

  await logsSynthtraceEsClient.index([logStream]);
}

/**
 * Creates metric data with SPIKE pattern.
 */
export async function createMetricChangePointsData({
  apmSynthtraceEsClient,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
}) {
  await apmSynthtraceEsClient.clean();

  const range = timerange(CHANGE_POINTS_ANALYSIS_WINDOW.start, CHANGE_POINTS_ANALYSIS_WINDOW.end);
  const spikeStart = datemath.parse(METRIC_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(METRIC_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.end)!.valueOf();

  const instance = apm
    .service({ name: SERVICE_NAME, environment: 'test', agentName: 'test-agent' })
    .instance('instance-test');

  const metricStream = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp < spikeEnd;
      const docCount = isSpike ? 500 : 5;

      const metrics = [];
      for (let i = 0; i < docCount; i++) {
        metrics.push(
          instance
            .appMetrics({
              'system.memory.actual.free': 1000,
              'system.memory.total': 10000,
            })
            .timestamp(timestamp)
        );
      }
      return metrics;
    });

  await apmSynthtraceEsClient.index([metricStream]);
}
