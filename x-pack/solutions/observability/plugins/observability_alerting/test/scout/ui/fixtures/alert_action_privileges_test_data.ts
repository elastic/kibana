/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import type { ObservabilityAlertingPage } from './page_objects';
import {
  READER_ES_PRIVILEGES,
  V1_EPISODE_TAG,
  V2_EPISODE_TAG,
  V2_PRIVILEGE_RULE_NAME,
} from './privilege_test_data';

export const V1_RULE_NAME = '[scout] Classic alert action privilege rule';

export const STACK_RULE_NAME = '[scout] Stack alert action privilege rule';

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
