/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';
import { DETECTION_ENGINE_RULES_URL_FIND } from '@kbn/security-solution-plugin/common/constants';
import { FindRulesResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';

/**
 * Get all installed security rules (both prebuilt + custom)
 *
 * @param es Elasticsearch client
 * @param supertest SuperTest instance
 * @param version Semver version of the `security_detection_engine` package to install
 * @returns Fleet install package response
 */

export const getInstalledRules = async (supertest: SuperTest.Agent): Promise<FindRulesResponse> => {
  const { body: rulesResponse } = await supertest
    .get(`${DETECTION_ENGINE_RULES_URL_FIND}?per_page=10000`)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send()
    .expect(200);

  return rulesResponse;
};
