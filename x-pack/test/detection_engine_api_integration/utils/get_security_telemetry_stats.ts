/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { SECURITY_TELEMETRY_URL } from '@kbn/security-solution-plugin/common/constants';

/**
 * Gets the stats from the stats endpoint within specifically the security_solutions application.
 * This is considered the "batch" telemetry.
 * @param supertest The supertest agent.
 * @returns The detection metrics
 */
export const getSecurityTelemetryStats = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<any> => {
  const response = await supertest
    .get(SECURITY_TELEMETRY_URL)
    .set('kbn-xsrf', 'true')
    .send({ unencrypted: true, refreshCache: true });
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting the batch stats for security_solutions. CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};
