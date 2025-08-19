/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RevertPrebuiltRulesRequest,
  RevertPrebuiltRulesResponseBody,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { REVERT_PREBUILT_RULES_URL } from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules/urls';
import type SuperTest from 'supertest';

/**
 * Reverts customized prebuilt rules to original base version
 *
 * @param supertest SuperTest instance
 * @returns `RevertPrebuiltRulesResponseBody` rules response
 */
export const revertPrebuiltRule = async (
  supertest: SuperTest.Agent,
  body: RevertPrebuiltRulesRequest
): Promise<RevertPrebuiltRulesResponseBody> => {
  const response = await supertest
    .post(REVERT_PREBUILT_RULES_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'securitySolution')
    .send(body);

  return response.body;
};
