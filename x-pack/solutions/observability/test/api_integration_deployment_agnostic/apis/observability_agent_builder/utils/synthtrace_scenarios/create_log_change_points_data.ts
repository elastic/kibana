/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { log, timerange } from '@kbn/synthtrace-client';

const DATASET = 'app.logs';
const SERVICE_NAME = 'test-service';
export const LOG_CHANGE_POINTS_DATA_STREAM = `logs-${DATASET}-default`;
export const LOG_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
};
export const LOG_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-25m',
};

/**
 * Creates log data with SPIKE pattern.
 */
export async function createLogChangePointsData({
  logsSynthtraceEsClient,
}: {
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
}) {
  const range = timerange(
    LOG_CHANGE_POINTS_ANALYSIS_WINDOW.start,
    LOG_CHANGE_POINTS_ANALYSIS_WINDOW.end
  );
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
