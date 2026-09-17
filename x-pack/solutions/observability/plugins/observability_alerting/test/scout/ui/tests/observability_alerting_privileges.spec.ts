/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import type { ObservabilityAlertingPage } from '../fixtures/page_objects';
import {
  createV1ThresholdSourceIndex,
  deleteV1PrivilegeAlerts,
  deleteV1PrivilegeRule,
  deleteV1ThresholdSourceIndex,
  deleteV2PrivilegeRule,
  CUSTOM_THRESHOLD_RULE_TYPE_ID,
  seedV2PrivilegeRule,
  THRESHOLD_DATA_VIEW_ID,
  THRESHOLD_TEST_INDEX,
  V1_EPISODE_TAG,
  V2_EPISODE_TAG,
  waitForV1RuleAlert,
} from '../fixtures/privilege_test_data';
import { OBSERVABILITY_ALERTING_ALERTS_PATH } from '../../../../public/constants';

type ElasticsearchPrivileges = KibanaRole['elasticsearch'];

const READER_ES_PRIVILEGES: ElasticsearchPrivileges = {
  cluster: [],
  indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
};

const NO_ACCESS_ES_PRIVILEGES: ElasticsearchPrivileges = {
  cluster: [],
  indices: [],
};

const LOGS_READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        logs: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const ALERTING_V2_ALERTS_READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_alerts: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const NO_ALERTING_ROLE: KibanaRole = {
  elasticsearch: NO_ACCESS_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/** Matches both the uncapped (`Showing N episode(s)`) and capped toolbar labels. */
const EPISODES_ITEM_COUNT_RE = /^Showing(?: first)? \d[\d,]* episodes?$/;

const assertEpisodesInboxHappyPath = async (
  observabilityAlerting: ObservabilityAlertingPage,
  expectedTags: readonly string[]
): Promise<void> => {
  await test.step('page renders without the privilege prompt', async () => {
    await expect(observabilityAlerting.pageTitle).toHaveText('Alert episodes', {
      timeout: 60_000,
    });
    await expect(observabilityAlerting.requiredPrivilegesPrompt).not.toBeVisible();
  });

  await test.step('KPI panels render successfully', async () => {
    await expect(observabilityAlerting.episodesKpisAlertsPanel).toBeVisible();
    await expect(observabilityAlerting.episodesKpisAlertActionsPanel).toBeVisible();
  });

  await test.step('histogram chart renders successfully', async () => {
    await expect(observabilityAlerting.episodesHistogramPanel).toBeVisible();
    await expect(observabilityAlerting.episodesHistogramChart).toBeVisible({ timeout: 30_000 });
    await expect(observabilityAlerting.episodesHistogramError).toHaveCount(0);
  });

  await test.step('episodes list resolves', async () => {
    await expect(observabilityAlerting.episodesListPage).toBeVisible();
    await expect(observabilityAlerting.episodesTableToolbar).toBeVisible({ timeout: 60_000 });
    await expect(observabilityAlerting.episodesItemCount).toHaveText(EPISODES_ITEM_COUNT_RE);
  });

  await test.step('tags filter lists expected source tags', async () => {
    await expect(observabilityAlerting.tagsFilterButton).toBeVisible();
    await observabilityAlerting.openTagsFilter();
    for (const tag of expectedTags) {
      await observabilityAlerting.searchTagsFilter(tag);
      await expect(observabilityAlerting.tagFilterOption(tag)).toBeVisible({
        timeout: 30_000,
      });
    }
  });
};

/*
 * Verifies that the observability alerting inbox page is fully accessible
 * when the user holds the v1 logs privilege or the v2 alerting_v2_alerts
 * privilege. Each privileged test asserts that the KPI panels, histogram,
 * list item count, and tags filter render. Logs read can RAC classic custom-threshold alerts, so
 * both seeded tags appear. `alerting_v2_alerts` + discover cannot RAC those
 * classic alerts, so only the v2 tag appears.
 * A user with none of these privileges is blocked by the RequiredPrivilegesPrompt.
 *
 * A v1 custom threshold rule (`observability.rules.custom_threshold`, consumer
 * `logs`) is created against a source index, forced with `runSoon`, and waited
 * on until a real observability threshold AAD document appears. A v2 rule (with
 * a tag action) is also created so the combined tag filter can show both sources.
 *
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe(
  'Observability Alerting - privilege-based page access',
  { tag: '@local-stateful-classic' },
  () => {
    let v1RuleId: string | undefined;
    let v2RuleId: string | undefined;

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
        name: '[scout] Observability privilege test rule',
        ruleTypeId: CUSTOM_THRESHOLD_RULE_TYPE_ID,
        consumer: 'logs',
        enabled: true,
        tags: [V1_EPISODE_TAG],
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
      const ruleId = created.data.id as string;
      v1RuleId = ruleId;
      await apiServices.alerting.rules.runSoon(ruleId);
      await waitForV1RuleAlert(esClient, kbnClient, ruleId);
      v2RuleId = await seedV2PrivilegeRule(esClient, kbnClient);
    });

    test.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      if (v1RuleId) {
        await deleteV1PrivilegeAlerts(esClient, v1RuleId);
        await deleteV1PrivilegeRule(kbnClient, v1RuleId);
      }
      await apiServices.dataViews.delete(THRESHOLD_DATA_VIEW_ID).catch(() => undefined);
      await deleteV1ThresholdSourceIndex(esClient);
      if (v2RuleId) {
        await deleteV2PrivilegeRule(esClient, kbnClient, v2RuleId);
      }
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('user with logs read privilege sees the full inbox page', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(LOGS_READ_ROLE);
      await pageObjects.observabilityAlerting.goto(OBSERVABILITY_ALERTING_ALERTS_PATH);
      await assertEpisodesInboxHappyPath(pageObjects.observabilityAlerting, [
        V1_EPISODE_TAG,
        V2_EPISODE_TAG,
      ]);
    });

    test('user with alerting_v2_alerts read privilege sees the full inbox page', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_READ_ROLE);
      await pageObjects.observabilityAlerting.goto(OBSERVABILITY_ALERTING_ALERTS_PATH);
      await assertEpisodesInboxHappyPath(pageObjects.observabilityAlerting, [V2_EPISODE_TAG]);
    });

    test('user with no alerting privileges is blocked', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(NO_ALERTING_ROLE);
      await pageObjects.observabilityAlerting.goto(OBSERVABILITY_ALERTING_ALERTS_PATH);

      await expect(pageObjects.observabilityAlerting.requiredPrivilegesPrompt).toBeVisible({
        timeout: 60_000,
      });
    });
  }
);
