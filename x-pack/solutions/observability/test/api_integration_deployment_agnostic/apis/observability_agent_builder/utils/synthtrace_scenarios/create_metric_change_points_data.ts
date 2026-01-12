/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { apm, timerange } from '@kbn/synthtrace-client';

const SERVICE_NAME = 'test-service';
export const METRIC_CHANGE_POINTS_INDEX = `metrics-apm.app.${SERVICE_NAME}-default`;
export const METRIC_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
};
export const METRIC_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-28m',
};

/**
 * Creates metric data with SPIKE pattern.
 */
export async function createMetricChangePointsData({
  apmSynthtraceEsClient,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
}) {
  await apmSynthtraceEsClient.clean();

  const range = timerange(
    METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.start,
    METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.end
  );
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
      const memoryFree = isSpike ? 10000 : 1000;

      const metrics = [];
      for (let i = 0; i < docCount; i++) {
        metrics.push(
          instance
            .appMetrics({
              'system.memory.actual.free': memoryFree,
              'system.memory.total': 10000,
            })
            .timestamp(timestamp)
        );
      }
      return metrics;
    });

  await apmSynthtraceEsClient.index([metricStream]);
}
