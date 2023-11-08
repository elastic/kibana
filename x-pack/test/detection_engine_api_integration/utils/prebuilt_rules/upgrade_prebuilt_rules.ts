/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PERFORM_RULE_UPGRADE_URL,
  RuleVersionSpecifier,
  PerformRuleUpgradeResponseBody,
} from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules';
import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';

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
  es: Client,
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
    .set('elastic-api-version', '1')
    .send(payload)
    .expect(200);

  // Before we proceed, we need to refresh saved object indices.
  // At the previous step we upgraded the prebuilt rules, which, under the hoods, installs new versions
  // of the prebuilt detection rules SO of type 'security-rule'.
  // The savedObjectsClient does this with a call with explicit `refresh: false`.
  // So, despite of the fact that the endpoint waits until the prebuilt rule will be
  // successfully indexed, it doesn't wait until they become "visible" for subsequent read
  // operations.
  // And this is usually what we do next in integration tests: we read these SOs with utility
  // function such as getPrebuiltRulesAndTimelinesStatus().
  // This can cause race conditions between a write and subsequent read operation, and to
  // fix it deterministically we have to refresh saved object indices and wait until it's done.
  await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

  return response.body;
};
