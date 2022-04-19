/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type { FullResponseSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';

import {
  DETECTION_ENGINE_RULES_URL,
  INTERNAL_IMMUTABLE_KEY,
  INTERNAL_RULE_ID_KEY,
} from '@kbn/security-solution-plugin/common/constants';

/**
 * Helper to cut down on the noise in some of the tests. This
 * uses the find API to get an immutable rule by id.
 * @param supertest The supertest deps
 */
export const findImmutableRuleById = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ruleId: string
): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: FullResponseSchema[];
}> => {
  const response = await supertest
    .get(
      `${DETECTION_ENGINE_RULES_URL}/_find?filter=alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true" AND alert.attributes.tags: "${INTERNAL_RULE_ID_KEY}:${ruleId}"`
    )
    .set('kbn-xsrf', 'true')
    .send();
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when finding an immutable rule by id (findImmutableRuleById). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};
