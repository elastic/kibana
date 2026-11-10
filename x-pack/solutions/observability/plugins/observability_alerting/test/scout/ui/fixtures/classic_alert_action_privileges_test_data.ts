/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, EsClient, KbnClient, KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import type { ObservabilityAlertingPage } from './page_objects';
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
  V1_EPISODE_TAG,
  V2_EPISODE_TAG,
  V2_PRIVILEGE_RULE_NAME,
  waitForStackRuleAlert,
  waitForV1RuleAlert,
} from './privilege_test_data';

export const V1_RULE_NAME = '[scout] Classic alert action privilege rule';

export const STACK_RULE_NAME = '[scout] Stack alert action privilege rule';

const READER_ES_PRIVILEGES: KibanaRole['elasticsearch'] = {
  cluster: [],
  indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
};

const buildRole = (feature: KibanaRole['kibana'][number]['feature']): KibanaRole => ({
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

export const LOGS_ALL_ROLE = buildRole({ logs: ['all'] });

export const OBSERVABILITY_ALERTS_ALL_ROLE = buildRole({ observabilityAlerts: ['all'] });

export const OBSERVABILITY_ALERTS_READ_ROLE = buildRole({ observabilityAlerts: ['read'] });

export const STACK_ALERTS_ALL_ROLE = buildRole({ stackAlertsOnly: ['all'] });

export const OBSERVABILITY_READ_STACK_WRITE_ROLE = buildRole({
  observabilityAlerts: ['read'],
  stackAlertsOnly: ['all'],
});

/** Rule privileges on APM rule types only, which do not cover the seeded custom threshold rule. */
export const APM_ALL_OBSERVABILITY_ALERTS_READ_ROLE = buildRole({
  apm: ['all'],
  observabilityAlerts: ['read'],
});

export const UNIVERSAL_WRITE_CLASSIC_READ_ROLE = buildRole({
  alerting_v2_alerts: ['all'],
  alerting_v2_rules: ['read'],
  observabilityAlerts: ['read'],
});

export const CLASSIC_WRITE_UNIVERSAL_READ_ROLE = buildRole({
  observabilityAlerts: ['all'],
  alerting_v2_alerts: ['read'],
  alerting_v2_rules: ['read'],
});

export const OPEN_IN_DISCOVER_ACTION_ID = 'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER';

const EPISODE_WRITE_ACTION_IDS = [
  'ALERTING_V2_ACK_EPISODE',
  'ALERTING_V2_RESOLVE_EPISODE',
  'ALERTING_V2_EDIT_EPISODE_TAGS',
] as const;

/** Creates a custom threshold rule over a seeded index and waits for its alert. */
export const createV1PrivilegeRule = async ({
  apiServices,
  esClient,
  kbnClient,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  kbnClient: KbnClient;
}): Promise<string> => {
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
    schedule: { interval: '1m' },
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
  const ruleId = created.data.id as string;
  try {
    await apiServices.alerting.rules.runSoon(ruleId);
    await waitForV1RuleAlert(esClient, kbnClient, ruleId);
    return ruleId;
  } catch (error) {
    await deleteV1PrivilegeAlerts(esClient, ruleId);
    await deleteV1PrivilegeRule(kbnClient, ruleId);
    throw error;
  }
};

/** Removes the custom threshold rule, its alerts, and the seeded index and data view. */
export const deleteV1PrivilegeRuleData = async ({
  apiServices,
  esClient,
  kbnClient,
  ruleId,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  kbnClient: KbnClient;
  ruleId?: string;
}): Promise<void> => {
  if (ruleId) {
    await deleteV1PrivilegeAlerts(esClient, ruleId);
    await deleteV1PrivilegeRule(kbnClient, ruleId);
  }
  await apiServices.dataViews.delete(THRESHOLD_DATA_VIEW_ID).catch(() => undefined);
  await deleteV1ThresholdSourceIndex(esClient);
};

/** Creates an Elasticsearch query rule over the seeded index and waits for its alert. */
export const createStackPrivilegeRule = async ({
  apiServices,
  esClient,
  kbnClient,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  kbnClient: KbnClient;
}): Promise<string> => {
  const created = await apiServices.alerting.rules.create({
    name: STACK_RULE_NAME,
    ruleTypeId: ES_QUERY_RULE_TYPE_ID,
    consumer: 'stackAlerts',
    enabled: true,
    schedule: { interval: '1m' },
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
  const ruleId = created.data.id as string;
  try {
    await apiServices.alerting.rules.runSoon(ruleId);
    await waitForStackRuleAlert(esClient, ruleId);
    return ruleId;
  } catch (error) {
    await deleteStackPrivilegeAlerts(esClient, ruleId);
    await deleteV1PrivilegeRule(kbnClient, ruleId);
    throw error;
  }
};

/** Removes the Elasticsearch query rule and its alerts. */
export const deleteStackPrivilegeRuleData = async ({
  esClient,
  kbnClient,
  ruleId,
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
  ruleId?: string;
}): Promise<void> => {
  if (!ruleId) {
    return;
  }
  await deleteStackPrivilegeAlerts(esClient, ruleId);
  await deleteV1PrivilegeRule(kbnClient, ruleId);
};

/** Opens the alerts inbox filtered to one rule and waits for its row. */
export const gotoSeededClassicAlert = async (
  observabilityAlerting: ObservabilityAlertingPage,
  ruleId: string,
  ruleName: string
): Promise<void> => {
  await observabilityAlerting.gotoInboxFilteredByRule(ruleId);
  await expect(observabilityAlerting.episodeRuleCell(ruleName)).toBeVisible({
    timeout: 60_000,
  });
};

/** Opens the alerts inbox filtered to the seeded classic and universal alerts and waits for both rows. */
export const gotoSeededMixedSourceAlerts = async (
  observabilityAlerting: ObservabilityAlertingPage
): Promise<void> => {
  await observabilityAlerting.gotoInboxFilteredByTags([V1_EPISODE_TAG, V2_EPISODE_TAG]);
  for (const ruleName of [V1_RULE_NAME, V2_PRIVILEGE_RULE_NAME]) {
    await expect(observabilityAlerting.episodeRuleCell(ruleName)).toBeVisible({
      timeout: 60_000,
    });
  }
};

/** Asserts the row of `ruleName` offers every episode write action. */
export const expectEpisodeWriteActions = async (
  observabilityAlerting: ObservabilityAlertingPage,
  ruleName: string
): Promise<void> => {
  await expect(async () => {
    await observabilityAlerting.closeEpisodeRowActionsMenu();
    await observabilityAlerting.openEpisodeRowActionsMenu(ruleName);
    for (const actionId of EPISODE_WRITE_ACTION_IDS) {
      await expect(observabilityAlerting.episodeRowAction(actionId, ruleName)).toBeVisible({
        timeout: 2_000,
      });
    }
  }).toPass();
  await observabilityAlerting.closeEpisodeRowActionsMenu();
};

/**
 * Asserts the row of `ruleName` renders no episode write action, inline or in its actions menu,
 * and leaves the menu open so read-safe actions can be asserted on.
 */
export const expectNoEpisodeWriteActions = async (
  observabilityAlerting: ObservabilityAlertingPage,
  ruleName: string
): Promise<void> => {
  if (await observabilityAlerting.episodeRowActionsMenuButton(ruleName).count()) {
    await observabilityAlerting.openEpisodeRowActionsMenu(ruleName);
  }
  for (const actionId of EPISODE_WRITE_ACTION_IDS) {
    await expect(observabilityAlerting.episodeRowAction(actionId, ruleName)).toHaveCount(0);
  }
};
