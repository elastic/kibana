/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/dev-utils';
import type SuperTest from 'supertest';
import type { DetectionMetrics } from '../../../plugins/security_solution/server/usage/detections/types';

import { getStatsUrl } from './get_stats_url';
import { getDetectionMetricsFromBody } from './get_detection_metrics_from_body';

/**
 * Gets the stats from the stats endpoint.
 * @param supertest The supertest agent.
 * @returns The detection metrics
 */
export const getStats = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<DetectionMetrics> => {
  const response = await supertest
    .post(getStatsUrl())
    .set('kbn-xsrf', 'true')
    .send({ unencrypted: true, refreshCache: true });
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting the stats for detections. CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return getDetectionMetricsFromBody(response.body);
};
