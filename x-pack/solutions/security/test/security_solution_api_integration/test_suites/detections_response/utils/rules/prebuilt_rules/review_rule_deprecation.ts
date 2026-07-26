/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import {
  REVIEW_RULE_DEPRECATION_URL,
  type ReviewRuleDeprecationRequestBody,
  type ReviewRuleDeprecationResponseBody,
} from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules';
import { refreshSavedObjectIndices } from '../../refresh_index';

/**
 * Calls the POST /internal/prebuilt_rules/deprecation/_review endpoint.
 *
 * @param es Elasticsearch client (used to refresh indices before the call)
 * @param supertest SuperTest instance
 * @param body Optional request body (null or object with optional ids array)
 * @param expectedStatusCode Expected HTTP status code (default 200)
 */
export const reviewRuleDeprecation = async (
  es: Client,
  supertest: SuperTest.Agent,
  body?: ReviewRuleDeprecationRequestBody,
  expectedStatusCode: number = 200
): Promise<ReviewRuleDeprecationResponseBody> => {
  await refreshSavedObjectIndices(es);

  const response = await supertest
    .post(REVIEW_RULE_DEPRECATION_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'foo')
    .send(body ?? undefined)
    .expect(expectedStatusCode);

  return response.body;
};
