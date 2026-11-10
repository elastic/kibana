/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import {
  createStackPrivilegeRule,
  createV1PrivilegeRule,
  deleteStackPrivilegeRuleData,
  deleteV1PrivilegeRuleData,
  expectEpisodeWriteActions,
  gotoSeededClassicAlert,
  OBSERVABILITY_READ_STACK_WRITE_ROLE,
  STACK_ALERTS_ALL_ROLE,
  STACK_RULE_NAME,
  V1_RULE_NAME,
} from '../fixtures/classic_alert_action_privileges_test_data';

/* Stateful only: serverless Observability hides `stackAlertsOnly`, so the feature grants no privileges there. */
test.describe(
  'Observability Alerting - classic stack alert action privileges',
  { tag: tags.stateful.classic },
  () => {
    let v1RuleId: string;
    let stackRuleId: string;

    test.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      test.setTimeout(180_000);
      await setAlertingV2EnabledSetting(kbnClient, true);
      v1RuleId = await createV1PrivilegeRule({ apiServices, esClient, kbnClient });
      stackRuleId = await createStackPrivilegeRule({ apiServices, esClient, kbnClient });
    });

    test.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await deleteStackPrivilegeRuleData({ esClient, kbnClient, ruleId: stackRuleId });
      await deleteV1PrivilegeRuleData({ apiServices, esClient, kbnClient, ruleId: v1RuleId });
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('user with the stack alerts write capability sees the stack alert write actions', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ALL_ROLE);
      await gotoSeededClassicAlert(pageObjects.observabilityAlerting, stackRuleId, STACK_RULE_NAME);
      await expectEpisodeWriteActions(pageObjects.observabilityAlerting, STACK_RULE_NAME);
    });

    test('write capability on any classic alerts feature applies to every classic alert', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(OBSERVABILITY_READ_STACK_WRITE_ROLE);
      await gotoSeededClassicAlert(pageObjects.observabilityAlerting, v1RuleId, V1_RULE_NAME);
      await expectEpisodeWriteActions(pageObjects.observabilityAlerting, V1_RULE_NAME);
    });
  }
);
