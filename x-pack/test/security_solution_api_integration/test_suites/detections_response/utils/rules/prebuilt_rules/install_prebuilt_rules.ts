/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PERFORM_RULE_INSTALLATION_URL,
  RuleVersionSpecifier,
  PerformRuleInstallationResponseBody,
} from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules';
import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { refreshSavedObjectIndices } from '../../refresh_index';

/**
 * Installs available prebuilt rules in Kibana. Rules are
 * installed from the security-rule saved objects.
 *
 * - No rules will be installed if there are no security-rule assets (e.g., the
 *   package is not installed or mocks are not created).
 *
 * - Pass in an array of rule version specifiers to install specific rules. Otherwise
 *   all available rules will be installed.
 *
 * @param supertest SuperTest instance
 * @param rules Array of rule version specifiers to install (optional)
 * @returns Install prebuilt rules response
 */
export const installPrebuiltRules = async (
  es: Client,
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  rules?: RuleVersionSpecifier[]
): Promise<PerformRuleInstallationResponseBody> => {
  let payload = {};
  if (rules) {
    payload = { mode: 'SPECIFIC_RULES', rules };
  } else {
    payload = { mode: 'ALL_RULES' };
  }
  const response = await supertest
    .post(PERFORM_RULE_INSTALLATION_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'foo')
    .send(payload)
    .expect(200);

  await refreshSavedObjectIndices(es);

  return response.body;
};
