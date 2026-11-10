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
  APM_ALL_OBSERVABILITY_ALERTS_READ_ROLE,
  CLASSIC_WRITE_UNIVERSAL_READ_ROLE,
  createV1PrivilegeRule,
  deleteV1PrivilegeRuleData,
  expectEpisodeWriteActions,
  expectNoEpisodeWriteActions,
  gotoSeededClassicAlert,
  gotoSeededMixedSourceAlerts,
  LOGS_ALL_ROLE,
  OBSERVABILITY_ALERTS_ALL_ROLE,
  OBSERVABILITY_ALERTS_READ_ROLE,
  OPEN_IN_DISCOVER_ACTION_ID,
  UNIVERSAL_WRITE_CLASSIC_READ_ROLE,
  V1_RULE_NAME,
} from '../fixtures/classic_alert_action_privileges_test_data';
import {
  deleteV2PrivilegeRule,
  seedV2PrivilegeRule,
  V2_PRIVILEGE_RULE_NAME,
} from '../fixtures/privilege_test_data';

test.describe(
  'Observability Alerting - classic alert action privileges',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let v1RuleId: string;
    let v2RuleId: string;

    test.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      test.setTimeout(180_000);
      await setAlertingV2EnabledSetting(kbnClient, true);
      v1RuleId = await createV1PrivilegeRule({ apiServices, esClient, kbnClient });
      v2RuleId = await seedV2PrivilegeRule(esClient, kbnClient);
    });

    test.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      if (v2RuleId) {
        await deleteV2PrivilegeRule(esClient, kbnClient, v2RuleId);
      }
      await deleteV1PrivilegeRuleData({ apiServices, esClient, kbnClient, ruleId: v1RuleId });
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('user with rule privileges on the alert sees the classic write actions', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(LOGS_ALL_ROLE);
      await gotoSeededClassicAlert(pageObjects.observabilityAlerting, v1RuleId, V1_RULE_NAME);
      await expectEpisodeWriteActions(pageObjects.observabilityAlerting, V1_RULE_NAME);
    });

    test('user with the alerts-only write capability sees the classic write actions', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(OBSERVABILITY_ALERTS_ALL_ROLE);
      await gotoSeededClassicAlert(pageObjects.observabilityAlerting, v1RuleId, V1_RULE_NAME);
      await expectEpisodeWriteActions(pageObjects.observabilityAlerting, V1_RULE_NAME);
    });

    test('rule privileges on any rule type grant the classic write actions', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(APM_ALL_OBSERVABILITY_ALERTS_READ_ROLE);
      await gotoSeededClassicAlert(pageObjects.observabilityAlerting, v1RuleId, V1_RULE_NAME);
      await expectEpisodeWriteActions(pageObjects.observabilityAlerting, V1_RULE_NAME);
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
          observabilityAlerting.episodeRowAction(VIEW_V1_ALERT_IN_APP_ACTION_ID, V1_RULE_NAME)
        ).toBeVisible();
      });

      await test.step('no write action is rendered, inline or in the overflow menu', async () => {
        await expectNoEpisodeWriteActions(observabilityAlerting, V1_RULE_NAME);
      });
    });

    test('universal write privilege only enables write actions on the universal alert', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(UNIVERSAL_WRITE_CLASSIC_READ_ROLE);
      const { observabilityAlerting } = pageObjects;
      await gotoSeededMixedSourceAlerts(observabilityAlerting);

      await test.step('the universal alert offers the write actions', async () => {
        await expectEpisodeWriteActions(observabilityAlerting, V2_PRIVILEGE_RULE_NAME);
      });

      await test.step('the classic alert offers no write action', async () => {
        await expectNoEpisodeWriteActions(observabilityAlerting, V1_RULE_NAME);
      });
    });

    test('classic write privilege only enables write actions on the classic alert', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(CLASSIC_WRITE_UNIVERSAL_READ_ROLE);
      const { observabilityAlerting } = pageObjects;
      await gotoSeededMixedSourceAlerts(observabilityAlerting);

      await test.step('the classic alert offers the write actions', async () => {
        await expectEpisodeWriteActions(observabilityAlerting, V1_RULE_NAME);
      });

      await test.step('the universal alert offers no write action', async () => {
        await expectNoEpisodeWriteActions(observabilityAlerting, V2_PRIVILEGE_RULE_NAME);
      });

      await test.step('the universal alert keeps the self-authorizing actions', async () => {
        await expect(
          observabilityAlerting.episodeRowAction(OPEN_IN_DISCOVER_ACTION_ID, V2_PRIVILEGE_RULE_NAME)
        ).toBeVisible();
      });
    });
  }
);
