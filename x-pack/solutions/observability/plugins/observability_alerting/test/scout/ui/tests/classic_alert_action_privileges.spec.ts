/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { VIEW_V1_ALERT_IN_APP_ACTION_ID } from '../../../../public/actions/view_in_app_action_id';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import {
  createV1PrivilegeRule,
  deleteV1PrivilegeRuleData,
  expectClassicWriteActions,
  expectNoClassicWriteActions,
  gotoSeededClassicAlert,
  LOGS_ALL_ROLE,
  OBSERVABILITY_ALERTS_ALL_ROLE,
  OBSERVABILITY_ALERTS_READ_ROLE,
  V1_RULE_NAME,
} from '../fixtures/classic_alert_action_privileges_test_data';

test.describe(
  'Observability Alerting - classic alert action privileges',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let v1RuleId: string;

    test.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      test.setTimeout(180_000);
      await setAlertingV2EnabledSetting(kbnClient, true);
      v1RuleId = await createV1PrivilegeRule({ apiServices, esClient, kbnClient });
    });

    test.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await deleteV1PrivilegeRuleData({ apiServices, esClient, kbnClient, ruleId: v1RuleId });
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('user with rule privileges on the alert sees the classic write actions', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(LOGS_ALL_ROLE);
      await gotoSeededClassicAlert(pageObjects.observabilityAlerting, v1RuleId, V1_RULE_NAME);
      await expectClassicWriteActions(pageObjects.observabilityAlerting, V1_RULE_NAME);
    });

    test('user with the alerts-only write capability sees the classic write actions', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(OBSERVABILITY_ALERTS_ALL_ROLE);
      await gotoSeededClassicAlert(pageObjects.observabilityAlerting, v1RuleId, V1_RULE_NAME);
      await expectClassicWriteActions(pageObjects.observabilityAlerting, V1_RULE_NAME);
    });

    test('read-only user only sees the read-safe view-in-app action', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(OBSERVABILITY_ALERTS_READ_ROLE);
      const { observabilityAlerting } = pageObjects;
      await gotoSeededClassicAlert(observabilityAlerting, v1RuleId, V1_RULE_NAME);

      await test.step('the read-safe view-in-app control is available', async () => {
        await expect(
          observabilityAlerting.episodeRowAction(VIEW_V1_ALERT_IN_APP_ACTION_ID)
        ).toBeVisible();
      });

      await test.step('no write action is rendered, inline or in the overflow menu', async () => {
        await expectNoClassicWriteActions(observabilityAlerting, V1_RULE_NAME);
      });
    });
  }
);
