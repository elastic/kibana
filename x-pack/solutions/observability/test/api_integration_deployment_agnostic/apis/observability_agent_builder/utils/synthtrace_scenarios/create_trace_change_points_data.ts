/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { apm, timerange } from '@kbn/synthtrace-client';

export const SERVICE_NAME = 'test-service';
export const TRACE_CHANGE_POINTS_INDEX = `traces-apm.app.${SERVICE_NAME}-default`;
export const TRACE_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
};
export const TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-28m',
};

/**
 * Creates trace data with SPIKE pattern.
 */
export async function createTraceChangePointsData({
  apmSynthtraceEsClient,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
}) {
  const range = timerange(
    TRACE_CHANGE_POINTS_ANALYSIS_WINDOW.start,
    TRACE_CHANGE_POINTS_ANALYSIS_WINDOW.end
  );

  const spikeStart = datemath.parse(TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.end)!.valueOf();

  const instance = apm
    .service({ name: SERVICE_NAME, environment: 'test', agentName: 'test-agent' })
    .instance('instance-test');

  const transactionName = 'GET /api/orders';

  const traceStream = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp < spikeEnd;

      const txDurationUs = isSpike ? 5_000 : 500;
      const spanDurationUs = isSpike ? 10_000 : 1_000;

      const traces = [];
      for (let i = 0; i < 25; i++) {
        traces.push(
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(txDurationUs)
            .children(
              instance
                .span({ spanName: 'db.query', spanType: 'db' })
                .timestamp(timestamp)
                .duration(spanDurationUs)
                .success()
            )
            .success()
        );
      }
      return traces;
    });

  await apmSynthtraceEsClient.index([traceStream]);
}
