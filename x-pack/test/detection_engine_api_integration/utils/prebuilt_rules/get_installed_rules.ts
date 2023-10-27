/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';
import { DETECTION_ENGINE_RULES_URL_FIND } from '@kbn/security-solution-plugin/common/constants';
import { RuleResponse } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

/**
 * Get all installed security rules (both prebuilt + custom)
 *
 * @param es Elasticsearch client
 * @param supertest SuperTest instance
 * @param version Semver version of the `security_detection_engine` package to install
 * @returns Fleet install package response
 */

interface GetInstalledRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: RuleResponse[];
}

export const getInstalledRules = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>
): Promise<GetInstalledRulesResponse> => {
  const { body: rulesResponse } = await supertest
    .get(`${DETECTION_ENGINE_RULES_URL_FIND}?per_page=10000`)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(200);

  return rulesResponse;
};
