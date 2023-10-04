/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetPrebuiltRulesAndTimelinesStatusResponse,
  PREBUILT_RULES_STATUS_URL,
} from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';
import type SuperTest from 'supertest';

/**
 * (LEGACY)
 * Helper to retrieve the prebuilt rules status
 *
 * @param supertest The supertest deps
 */
export const getPrebuiltRulesAndTimelinesStatus = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>
): Promise<GetPrebuiltRulesAndTimelinesStatusResponse> => {
  const response = await supertest
    .get(PREBUILT_RULES_STATUS_URL)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(200);

  return response.body;
};
