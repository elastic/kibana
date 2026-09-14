/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { setAlertingV2EnabledSetting } from '../fixtures/alerting_v2_setting';
import { OBSERVABILITY_ALERTING_INBOX_PATH } from '../../../../public/constants';

type ElasticsearchPrivileges = KibanaRole['elasticsearch'];

const READER_ES_PRIVILEGES: ElasticsearchPrivileges = {
  cluster: ['monitor'],
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

const STACK_ALERTS_ONLY_READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        stackAlertsOnly: ['read'],
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

const SCOUT_RULE_ID = 'scout-obs-privilege-test-rule';

const createV1Rule = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    description: 'create v1 .index-threshold rule for privilege test',
    path: `/api/alerting/rule/${SCOUT_RULE_ID}`,
    method: 'POST',
    body: {
      name: '[scout] Observability privilege test rule',
      rule_type_id: '.index-threshold',
      consumer: 'stackAlerts',
      tags: ['scout-privilege-test'],
      schedule: { interval: '10s' },
      enabled: true,
      actions: [],
      params: {
        index: ['.kibana_task_manager*'],
        timeField: 'runAt',
        aggType: 'count',
        groupBy: 'all',
        termSize: 5,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: '>',
        threshold: [0],
      },
    },
    ignoreErrors: [409],
  });
};

const deleteV1Rule = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    description: 'delete v1 privilege test rule',
    path: `/api/alerting/rule/${SCOUT_RULE_ID}`,
    method: 'DELETE',
    ignoreErrors: [404],
  });
};

const waitForRuleExecution = async (kbnClient: KbnClient): Promise<void> => {
  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await kbnClient.request<{ execution_status: { status: string } }>({
        description: 'check rule execution status',
        path: `/api/alerting/rule/${SCOUT_RULE_ID}`,
        method: 'GET',
        retries: 0,
      });
      const status = response.data.execution_status?.status;
      if (status === 'active' || status === 'ok') return;
    } catch {
      // rule may not be queryable yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
};

/*
 * Verifies that the observability alerting inbox page is fully accessible
 * when the user holds any of the v1 alerting privileges (logs, stackAlertsOnly)
 * or the v2 alerting_v2_alerts privilege. Each privileged test asserts that
 * the KPI panels, histogram, and episodes list page render without error callouts.
 * A user with none of these privileges is blocked by the RequiredPrivilegesPrompt.
 *
 * A v1 `.es-query` rule is created in beforeAll so classic alerts appear in the
 * combined episodes table for privilege-gated users.
 *
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe(
  'Observability Alerting - privilege-based page access',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      await deleteV1Rule(kbnClient);
      await createV1Rule(kbnClient);
      await waitForRuleExecution(kbnClient);
    });

    test.afterAll(async ({ kbnClient }) => {
      await deleteV1Rule(kbnClient);
    });

    test('user with logs read privilege sees the full inbox page', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(LOGS_READ_ROLE);
      await pageObjects.observabilityAlerting.goto(OBSERVABILITY_ALERTING_INBOX_PATH);
      const { observabilityAlerting } = pageObjects;

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
        await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
        await expect(
          page.locator('[data-test-subj="episodesHistogramPanel"] .euiCallOut--danger')
        ).toHaveCount(0);
      });

      await test.step('episodes list page container renders', async () => {
        await expect(observabilityAlerting.episodesListPage).toBeVisible();
      });
    });

    test('user with stackAlertsOnly read privilege sees the full inbox page', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ONLY_READ_ROLE);
      await pageObjects.observabilityAlerting.goto(OBSERVABILITY_ALERTING_INBOX_PATH);
      const { observabilityAlerting } = pageObjects;

      await test.step('page renders without the privilege prompt', async () => {
        await expect(observabilityAlerting.pageTitle).toHaveText('Alert episodes', {
          timeout: 60_000,
        });
        await expect(observabilityAlerting.requiredPrivilegesPrompt).not.toBeVisible();
      });

      await test.step('KPI panels render without errors', async () => {
        await expect(observabilityAlerting.episodesKpisAlertsPanel).toBeVisible();
        await expect(observabilityAlerting.episodesKpisAlertActionsPanel).toBeVisible();
      });

      await test.step('histogram chart renders successfully', async () => {
        await expect(observabilityAlerting.episodesHistogramPanel).toBeVisible();
        await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
        await expect(
          page.locator('[data-test-subj="episodesHistogramPanel"] .euiCallOut--danger')
        ).toHaveCount(0);
      });

      await test.step('episodes list page container renders', async () => {
        await expect(observabilityAlerting.episodesListPage).toBeVisible();
      });
    });

    test('user with alerting_v2_alerts read privilege sees the full inbox page', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_READ_ROLE);
      await pageObjects.observabilityAlerting.goto(OBSERVABILITY_ALERTING_INBOX_PATH);
      const { observabilityAlerting } = pageObjects;

      await test.step('page renders without the privilege prompt', async () => {
        await expect(observabilityAlerting.pageTitle).toHaveText('Alert episodes', {
          timeout: 60_000,
        });
        await expect(observabilityAlerting.requiredPrivilegesPrompt).not.toBeVisible();
      });

      await test.step('KPI panels render without errors', async () => {
        await expect(observabilityAlerting.episodesKpisAlertsPanel).toBeVisible();
        await expect(observabilityAlerting.episodesKpisAlertActionsPanel).toBeVisible();
      });

      await test.step('histogram chart renders successfully', async () => {
        await expect(observabilityAlerting.episodesHistogramPanel).toBeVisible();
        await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
        await expect(
          page.locator('[data-test-subj="episodesHistogramPanel"] .euiCallOut--danger')
        ).toHaveCount(0);
      });

      await test.step('episodes list page container renders', async () => {
        await expect(observabilityAlerting.episodesListPage).toBeVisible();
      });
    });

    test('user with no alerting privileges is blocked', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(NO_ALERTING_ROLE);
      await pageObjects.observabilityAlerting.goto(OBSERVABILITY_ALERTING_INBOX_PATH);

      await expect(pageObjects.observabilityAlerting.requiredPrivilegesPrompt).toBeVisible({
        timeout: 60_000,
      });
    });
  }
);
