/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { makeEsQueryRule } from '../fixtures/helpers';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import {
  MANAGEMENT_ALERTING_V2_URL_RE,
  MANAGEMENT_CLASSIC_RULES_URL_RE,
  OBS_V1_CREATE_URL_RE,
  OBS_V1_DETAILS_URL_RE,
  OBS_V1_EDIT_URL_RE,
  OBS_V1_LIST_URL_RE,
  OBS_V1_LOGS_URL_RE,
  STANDALONE_RULES_APP_URL_RE,
} from '../fixtures/page_objects';

const expectObservabilityHost = async (page: ScoutPage, pathRe: RegExp) => {
  await expect(page).toHaveURL(pathRe);
  await expect(page).not.toHaveURL(MANAGEMENT_CLASSIC_RULES_URL_RE);
  await expect(page).not.toHaveURL(STANDALONE_RULES_APP_URL_RE);
  await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_URL_RE);
};

/*
 * Corresponding coverage to the Stack Management classic v1 host-aware Scout
 * tests: landing each nested v1 route, then clicking through list / details /
 * create / edit / logs / settings and asserting the host stays Observability
 * Alerting (`/app/observability/alerting/rules/v1`).
 */
test.describe(
  'Observability classic (v1) Rules host-aware URLs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let ruleId: string;
    let ruleName: string;

    test.beforeAll(async ({ apiServices, kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      const response = await apiServices.alerting.rules.create(
        makeEsQueryRule('scout-obs-v1-host-aware')
      );
      ruleId = response.data.id;
      ruleName = response.data.name as string;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      if (ruleId) {
        await apiServices.alerting.rules.delete(ruleId);
      }
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('loads the rules list under Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto();
      await expect(rules.rulesList).toBeVisible({ timeout: 30_000 });
      await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
    });

    test('loads logs under Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto('/logs');
      await expect(rules.pageTitle).toHaveText('Logs', { timeout: 30_000 });
      await expectObservabilityHost(page, OBS_V1_LOGS_URL_RE);
    });

    test('loads the create form under Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto('/create/.es-query');
      await expect(rules.ruleForm).toBeVisible({ timeout: 30_000 });
      await expectObservabilityHost(page, OBS_V1_CREATE_URL_RE);
    });

    test('loads rule details under Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto(`/rule/${ruleId}`);

      await expect(rules.pageTitle).toBeVisible({ timeout: 30_000 });
      await expectObservabilityHost(page, OBS_V1_DETAILS_URL_RE);
      await expect(page).toHaveURL(new RegExp(`/rule/${ruleId}(/|$|\\?|#)`));
    });

    test('loads the edit form under Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto(`/edit/${ruleId}`);

      await expect(rules.ruleForm).toBeVisible({ timeout: 30_000 });
      await expectObservabilityHost(page, OBS_V1_EDIT_URL_RE);
      await expect(page).toHaveURL(new RegExp(`/edit/${ruleId}(/|$|\\?|#)`));
    });

    test('clicking a rule name stays on Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;

      await test.step('rule-name href is host-relative, not Stack Management', async () => {
        await rules.openListAndSearch(ruleName);
        await expect(rules.ruleNameLink(ruleName)).toBeVisible({ timeout: 30_000 });

        await expect(rules.ruleNameLink(ruleName)).toHaveAttribute(
          'href',
          /\/observability\/alerting\/rules\/v1\/rule\//
        );
        await expect(rules.ruleNameLink(ruleName)).not.toHaveAttribute(
          'href',
          MANAGEMENT_CLASSIC_RULES_URL_RE
        );
        await expect(rules.ruleNameLink(ruleName)).not.toHaveAttribute(
          'href',
          STANDALONE_RULES_APP_URL_RE
        );
        await expect(rules.ruleNameLink(ruleName)).not.toHaveAttribute(
          'href',
          MANAGEMENT_ALERTING_V2_URL_RE
        );
      });

      await test.step('click navigates to details on the observability mount', async () => {
        await rules.clickRuleName(ruleName);
        await expect(rules.pageTitle).toBeVisible({ timeout: 30_000 });
        await expectObservabilityHost(page, OBS_V1_DETAILS_URL_RE);
        await expect(page).toHaveURL(new RegExp(`/rule/${ruleId}(/|$|\\?|#)`));
      });
    });

    test('back button from details returns to the observability rules list', async ({
      page,
      pageObjects,
    }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto(`/rule/${ruleId}`);
      await expect(rules.backLink).toBeVisible({ timeout: 30_000 });

      await test.step('back href stays on the observability mount', async () => {
        await expect(rules.backLink).toHaveAttribute(
          'href',
          /\/observability\/alerting\/rules\/v1\/?(?:\?|#|$)/
        );
        await expect(rules.backLink).not.toHaveAttribute('href', MANAGEMENT_CLASSIC_RULES_URL_RE);
        await expect(rules.backLink).not.toHaveAttribute('href', STANDALONE_RULES_APP_URL_RE);
      });

      await test.step('clicking back lands on the rules list', async () => {
        await rules.clickBack();
        await expect(rules.rulesList).toBeVisible();
        await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
      });
    });

    test('create rule type selection stays on Observability Alerting', async ({
      page,
      pageObjects,
    }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto();
      await expect(rules.createButton).toBeVisible({ timeout: 30_000 });

      await test.step('open the rule type modal and select Elasticsearch query', async () => {
        await rules.openCreateRuleTypeModal();
        await rules.selectEsQueryRuleType();
      });

      await test.step('create form URL stays on the observability mount', async () => {
        await expectObservabilityHost(page, OBS_V1_CREATE_URL_RE);
      });

      await test.step('cancel returns to the observability rules list', async () => {
        await rules.clickCancel();
        await expect(rules.createButton).toBeVisible({ timeout: 30_000 });
        await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
      });
    });

    test('edit from the list stays on Observability Alerting and cancel returns to the list', async ({
      page,
      pageObjects,
    }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.openListAndSearch(ruleName);
      await expect(rules.ruleNameLink(ruleName)).toBeVisible({ timeout: 30_000 });

      await test.step('edit action opens the form on the observability mount', async () => {
        await rules.openEditFromList(ruleId);
        await expectObservabilityHost(page, OBS_V1_EDIT_URL_RE);
        await expect(page).toHaveURL(new RegExp(`/edit/${ruleId}(/|$|\\?|#)`));
      });

      await test.step('cancel returns to the observability rules list', async () => {
        await rules.clickCancel();
        await expect(rules.createButton).toBeVisible({ timeout: 30_000 });
        await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
      });
    });

    test('logs menu navigation stays on Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto();
      await expect(rules.rulesList).toBeVisible({ timeout: 30_000 });

      await test.step('open logs from the page menu', async () => {
        await rules.clickLogsMenuItem();
        await expect(rules.pageTitle).toHaveText('Logs');
        await expectObservabilityHost(page, OBS_V1_LOGS_URL_RE);
      });

      await test.step('back from logs returns to the observability rules list', async () => {
        await expect(rules.backLink).toHaveAttribute(
          'href',
          /\/observability\/alerting\/rules\/v1\/?(?:\?|#|$)/
        );
        await expect(rules.backLink).not.toHaveAttribute('href', MANAGEMENT_CLASSIC_RULES_URL_RE);
        await rules.clickBack();
        await expect(rules.rulesList).toBeVisible({ timeout: 30_000 });
        await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
      });

      await test.step('browser back and forward keep the observability host', async () => {
        await rules.clickLogsMenuItem();
        await expectObservabilityHost(page, OBS_V1_LOGS_URL_RE);

        await page.goBack();
        await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
        await expect(rules.rulesList).toBeVisible();

        await page.goForward();
        await expectObservabilityHost(page, OBS_V1_LOGS_URL_RE);
      });
    });

    test('settings flyout does not leave Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto();
      await expect(rules.rulesList).toBeVisible({ timeout: 30_000 });

      await test.step('open settings without changing the URL', async () => {
        await rules.openSettingsFlyout();
        await expect(rules.settingsFlyout).toBeVisible();
        await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
      });

      await test.step('close settings and stay on the observability rules list', async () => {
        await rules.closeSettingsFlyout();
        await expect(rules.settingsFlyout).toBeHidden();
        await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
      });
    });
  }
);
