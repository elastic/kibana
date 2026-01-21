/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REVIEW_RULE_INSTALLATION_URL } from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules/urls';
import type {
  ReviewRuleInstallationRequestBody,
  ReviewRuleInstallationResponseBody,
} from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route';
import type SuperTest from 'supertest';

/**
 * Returns prebuilt rules that are available to install
 *
 * @param supertest SuperTest instance
 * @returns Review Install prebuilt rules response
 */
export const reviewPrebuiltRulesToInstall = async (
  supertest: SuperTest.Agent,
  body?: ReviewRuleInstallationRequestBody,
  expectedStatusCode: number = 200
): Promise<ReviewRuleInstallationResponseBody> => {
  const response = await supertest
    .post(REVIEW_RULE_INSTALLATION_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'securitySolution')
    .send(body)
    .expect(expectedStatusCode);

  return response.body;
};
