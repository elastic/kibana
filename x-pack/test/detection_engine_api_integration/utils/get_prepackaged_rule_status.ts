/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import {
  PREBUILT_RULES_STATUS_URL,
  GetPrebuiltRulesAndTimelinesStatusResponse,
} from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';

/**
 * Helper to cut down on the noise in some of the tests. This
 * creates a new action and expects a 200 and does not do any retries.
 * @param supertest The supertest deps
 */
export const getPrePackagedRulesStatus = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<GetPrebuiltRulesAndTimelinesStatusResponse> => {
  const response = await supertest.get(PREBUILT_RULES_STATUS_URL).set('kbn-xsrf', 'true').send();

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting a pre-packaged rule status. CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};
