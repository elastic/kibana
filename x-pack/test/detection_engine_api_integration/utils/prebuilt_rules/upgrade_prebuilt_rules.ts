/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PERFORM_RULE_UPGRADE_URL,
  PerformRuleUpgradeResponseBody,
} from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';
import { RuleVersionSpecifier } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/model/rule_versions/rule_version_specifier';
import type SuperTest from 'supertest';

/**
 * Upgrades available prebuilt rules in Kibana.
 *
 * - Pass in an array of rule version specifiers to upgrade specific rules. Otherwise
 *   all available rules will be upgraded.
 *
 * @param supertest SuperTest instance
 * @param rules Array of rule version specifiers to upgrade (optional)
 * @returns Upgrade prebuilt rules response
 */
export const upgradePrebuiltRules = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  rules?: RuleVersionSpecifier[]
): Promise<PerformRuleUpgradeResponseBody> => {
  let payload = {};
  if (rules) {
    payload = { mode: 'SPECIFIC_RULES', rules, pick_version: 'TARGET' };
  } else {
    payload = { mode: 'ALL_RULES', pick_version: 'TARGET' };
  }
  const response = await supertest
    .post(PERFORM_RULE_UPGRADE_URL)
    .set('kbn-xsrf', 'true')
    .send(payload)
    .expect(200);

  return response.body;
};
