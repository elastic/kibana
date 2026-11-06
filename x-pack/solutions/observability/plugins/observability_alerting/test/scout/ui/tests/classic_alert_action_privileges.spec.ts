/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import type { KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { VIEW_V1_ALERT_IN_APP_ACTION_ID } from '../../../../public/actions/view_in_app_action_id';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import type { ObservabilityAlertingPage } from '../fixtures/page_objects';
import {
  createV1ThresholdSourceIndex,
  deleteStackPrivilegeAlerts,
  deleteV1PrivilegeAlerts,
  deleteV1PrivilegeRule,
  deleteV1ThresholdSourceIndex,
  CUSTOM_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_RULE_TYPE_ID,
  THRESHOLD_DATA_VIEW_ID,
  THRESHOLD_TEST_INDEX,
  waitForStackRuleAlert,
  waitForV1RuleAlert,
} from '../fixtures/privilege_test_data';

type ElasticsearchPrivileges = KibanaRole['elasticsearch'];

const READER_ES_PRIVILEGES: ElasticsearchPrivileges = {
  cluster: [],
  indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
};

const buildRole = (feature: KibanaRole['kibana'][number]['feature']): KibanaRole => ({
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

const LOGS_ALL_ROLE = buildRole({ logs: ['all'] });

const OBSERVABILITY_ALERTS_ALL_ROLE = buildRole({ observabilityAlerts: ['all'] });

const OBSERVABILITY_ALERTS_READ_ROLE = buildRole({ observabilityAlerts: ['read'] });

const STACK_ALERTS_ALL_ROLE = buildRole({ stackAlertsOnly: ['all'] });

const OBSERVABILITY_READ_STACK_WRITE_ROLE = buildRole({
  observabilityAlerts: ['read'],
  stackAlertsOnly: ['all'],
});

const V1_RULE_NAME = '[scout] Classic alert action privilege rule';

const STACK_RULE_NAME = '[scout] Stack alert action privilege rule';

const CLASSIC_WRITE_ACTION_IDS = [
  'ALERTING_V2_ACK_EPISODE',
  'ALERTING_V2_RESOLVE_EPISODE',
  'ALERTING_V2_EDIT_EPISODE_TAGS',
] as const;

const gotoSeededClassicAlert = async (
  observabilityAlerting: ObservabilityAlertingPage,
  ruleId: string,
  ruleName: string
): Promise<void> => {
  await observabilityAlerting.gotoInboxFilteredByRule(ruleId);
  await expect(observabilityAlerting.episodeRuleCell(ruleName)).toBeVisible({
    timeout: 60_000,
  });
};

const expectClassicWriteActions = async (
  observabilityAlerting: ObservabilityAlertingPage,
  ruleName: string
): Promise<void> => {
  await expect(async () => {
    await observabilityAlerting.openEpisodeRowActionsMenu(ruleName);
    for (const actionId of CLASSIC_WRITE_ACTION_IDS) {
      await expect(observabilityAlerting.episodeRowAction(actionId)).toBeVisible({
        timeout: 2_000,
      });
    }
  }).toPass();
};

const expectNoClassicWriteActions = async (
  observabilityAlerting: ObservabilityAlertingPage,
  ruleName: string
): Promise<void> => {
  if (await observabilityAlerting.rowActionsMenuButton.count()) {
    await observabilityAlerting.openEpisodeRowActionsMenu(ruleName);
  }
  for (const actionId of CLASSIC_WRITE_ACTION_IDS) {
    await expect(observabilityAlerting.episodeRowAction(actionId)).toHaveCount(0);
  }
};

test.describe(
  'Observability Alerting - classic alert action privileges',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let v1RuleId: string;
    let stackRuleId: string;

    test.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      test.setTimeout(180_000);
      await setAlertingV2EnabledSetting(kbnClient, true);
      await createV1ThresholdSourceIndex(esClient);
      await apiServices.dataViews.create({
        id: THRESHOLD_DATA_VIEW_ID,
        name: THRESHOLD_DATA_VIEW_ID,
        title: THRESHOLD_TEST_INDEX,
        timeFieldName: '@timestamp',
        override: true,
      });
      const created = await apiServices.alerting.rules.create({
        name: V1_RULE_NAME,
        ruleTypeId: CUSTOM_THRESHOLD_RULE_TYPE_ID,
        consumer: 'logs',
        enabled: true,
        schedule: { interval: '10s' },
        actions: [],
        params: {
          criteria: [
            {
              comparator: '>',
              threshold: [0],
              timeSize: 5,
              timeUnit: 'm',
              metrics: [{ name: 'A', aggType: 'count' }],
            },
          ],
          alertOnNoData: false,
          alertOnGroupDisappear: false,
          searchConfiguration: {
            query: { query: '', language: 'kuery' },
            index: THRESHOLD_DATA_VIEW_ID,
          },
        },
      });
      v1RuleId = created.data.id as string;
      await apiServices.alerting.rules.runSoon(v1RuleId);
      await waitForV1RuleAlert(esClient, kbnClient, v1RuleId);

      const createdStackRule = await apiServices.alerting.rules.create({
        name: STACK_RULE_NAME,
        ruleTypeId: ES_QUERY_RULE_TYPE_ID,
        consumer: 'stackAlerts',
        enabled: true,
        schedule: { interval: '10s' },
        actions: [],
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [0],
          index: [THRESHOLD_TEST_INDEX],
          timeField: '@timestamp',
          esQuery: JSON.stringify({ query: { match_all: {} } }),
          timeWindowSize: 1,
          timeWindowUnit: 'd',
          excludeHitsFromPreviousRun: false,
        },
      });
      stackRuleId = createdStackRule.data.id as string;
      await apiServices.alerting.rules.runSoon(stackRuleId);
      await waitForStackRuleAlert(esClient, stackRuleId);
    });

    test.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      if (v1RuleId) {
        await deleteV1PrivilegeAlerts(esClient, v1RuleId);
        await deleteV1PrivilegeRule(kbnClient, v1RuleId);
      }
      if (stackRuleId) {
        await deleteStackPrivilegeAlerts(esClient, stackRuleId);
        await deleteV1PrivilegeRule(kbnClient, stackRuleId);
      }
      await apiServices.dataViews.delete(THRESHOLD_DATA_VIEW_ID).catch(() => undefined);
      await deleteV1ThresholdSourceIndex(esClient);
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

    test('user with the stack alerts write capability sees the stack alert write actions', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ALL_ROLE);
      await gotoSeededClassicAlert(pageObjects.observabilityAlerting, stackRuleId, STACK_RULE_NAME);
      await expectClassicWriteActions(pageObjects.observabilityAlerting, STACK_RULE_NAME);
    });

    test('write capability for another rule type family leaves the alert read-only', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(OBSERVABILITY_READ_STACK_WRITE_ROLE);
      const { observabilityAlerting } = pageObjects;
      await gotoSeededClassicAlert(observabilityAlerting, v1RuleId, V1_RULE_NAME);
      await expectNoClassicWriteActions(observabilityAlerting, V1_RULE_NAME);
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
