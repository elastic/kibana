/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetPrebuiltRuleBaseVersionRequest,
  GetPrebuiltRuleBaseVersionResponseBody,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { GET_PREBUILT_RULES_BASE_VERSION_URL } from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules/urls';
import type SuperTest from 'supertest';

/**
 * Returns prebuilt rule base version, current version, and field diff
 *
 * @param supertest SuperTest instance
 * @returns `GetPrebuiltRuleBaseVersionResponseBody` rules response
 */
export const getPrebuiltRuleBaseVersion = async (
  supertest: SuperTest.Agent,
  query: GetPrebuiltRuleBaseVersionRequest
): Promise<GetPrebuiltRuleBaseVersionResponseBody> => {
  const response = await supertest
    .get(GET_PREBUILT_RULES_BASE_VERSION_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'securitySolution')
    .query(query)
    .expect(200);

  return response.body;
};
