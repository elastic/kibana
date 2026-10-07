/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  makeEsQueryRule,
  makeV1EsQueryRuleTemplateAttributes,
  RULE_TEMPLATE_SO_TYPE,
} from '@kbn/triggers-actions-ui-plugin/test/scout/common/ui/fixtures/helpers';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import {
  MANAGEMENT_ALERTING_V2_URL_RE,
  MANAGEMENT_CLASSIC_RULES_URL_RE,
  OBSERVABILITY_ALERTING_SURFACES,
  OBSERVABILITY_ALERTING_RULES_V1_URL_RE,
  OBSERVABILITY_ALERTING_RULES_V2_URL_RE,
  OBS_V1_CREATE_URL_RE,
  OBS_V1_DETAILS_URL_RE,
  OBS_V1_EDIT_URL_RE,
  OBS_V1_LIST_HREF_RE,
  OBS_V1_LIST_URL_RE,
  OBS_V1_LOGS_URL_RE,
  OBS_V1_NESTED_RULES_URL_RE,
  OBS_V1_RULE_NAME_HREF_RE,
  STANDALONE_RULES_APP_URL_RE,
} from '../fixtures/page_objects';
import {
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../../../../public/constants';

/*
 * Lives under the default Scout config (`test/scout/`) so
 * `alerting:v2:enabled` stays unpinned and can be flipped at runtime. Flag
 * on/off URL mounts, tab switches, and classic v1 host-aware coverage share
 * this one describe so they cannot run on parallel workers against the same
 * global setting (Scout `fullyParallel: false`). Scout allows only one
 * describe per file and forbids nesting. The dedicated `scout_alerting_v2`
 * config pins the setting on and cannot cover the flag-off case.
 *
 * One test per URL so a redirect or title mismatch is isolated to that path.
 * Assert v1 page URLs only after in-page clicks (or browser back/forward),
 * never after a direct goto of the URL under test.
 */
const expectObservabilityHost = async (page: ScoutPage, pathRe: RegExp) => {
  await expect(page).toHaveURL(pathRe);
  await expect(page).not.toHaveURL(OBS_V1_NESTED_RULES_URL_RE);
  await expect(page).not.toHaveURL(MANAGEMENT_CLASSIC_RULES_URL_RE);
  await expect(page).not.toHaveURL(STANDALONE_RULES_APP_URL_RE);
  await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_URL_RE);
};

const expectObservabilityHref = async (locator: Locator) => {
  await expect(locator).not.toHaveAttribute('href', OBS_V1_NESTED_RULES_URL_RE);
  await expect(locator).not.toHaveAttribute('href', MANAGEMENT_CLASSIC_RULES_URL_RE);
  await expect(locator).not.toHaveAttribute('href', STANDALONE_RULES_APP_URL_RE);
  await expect(locator).not.toHaveAttribute('href', MANAGEMENT_ALERTING_V2_URL_RE);
};

test.describe(
  'Observability Alerting URLs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let ruleId: string;
    let ruleName: string;
    const templateId = `scout-v1-template-obs-${Date.now()}`;
    const templateName = `Scout v1 template ${templateId}`;

    test.beforeAll(async ({ apiServices, kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      const response = await apiServices.alerting.rules.create(
        makeEsQueryRule('scout-obs-v1-host-aware')
      );
      ruleId = response.data.id;
      ruleName = response.data.name as string;
      await kbnClient.savedObjects.create({
        type: RULE_TEMPLATE_SO_TYPE,
        id: templateId,
        overwrite: true,
        attributes: makeV1EsQueryRuleTemplateAttributes(templateName),
      });
    });

    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await setAlertingV2EnabledSetting(kbnClient, true);
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      if (ruleId) {
        await apiServices.alerting.rules.delete(ruleId);
      }
      try {
        await kbnClient.savedObjects.delete({
          type: RULE_TEMPLATE_SO_TYPE,
          id: templateId,
        });
      } catch {
        // beforeAll may have failed before the template was created
      }
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    for (const surface of OBSERVABILITY_ALERTING_SURFACES) {
      test(`returns app not found for ${surface.name} (${surface.path}) when alerting v2 is disabled`, async ({
        kbnClient,
        log,
        pageObjects,
      }) => {
        await unsetAlertingV2EnabledSetting(kbnClient);

        const requested = pageObjects.observabilityAlerting.urlFor(surface.path);
        log.debug(`[observability-alerting] requested ${requested}`);

        const landed = await pageObjects.observabilityAlerting.goto(surface.path);
        log.debug(`[observability-alerting] landed ${landed}`);

        await expect(pageObjects.observabilityAlerting.appNotFoundPageContent).toBeVisible({
          timeout: 30_000,
        });
      });

      test(`loads ${surface.name} (${surface.path}) when alerting v2 is enabled`, async ({
        log,
        pageObjects,
      }) => {
        const requested = pageObjects.observabilityAlerting.urlFor(surface.path);
        log.debug(`[observability-alerting] requested ${requested}`);

        const landed = await pageObjects.observabilityAlerting.goto(surface.path);
        log.debug(`[observability-alerting] landed ${landed}`);

        await expect(pageObjects.observabilityAlerting.pageTitle).toHaveText(surface.title, {
          timeout: 30_000,
        });
      });
    }

    test('switches between v1 and v2 rules tabs without leaving observability', async ({
      page,
      pageObjects,
    }) => {
      const alerting = pageObjects.observabilityAlerting;

      await test.step('start on v2 and switch to v1', async () => {
        await alerting.goto(OBSERVABILITY_ALERTING_RULES_V2_PATH);
        await expect(alerting.pageTitle).toHaveText('Rules', { timeout: 30_000 });
        await expect(alerting.v2RulesTab).toBeVisible();
        await expect(alerting.v1RulesTab).toBeVisible();

        await alerting.clickV1RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V1_URL_RE);
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'false');
      });

      await test.step('from v1, switch back to v2', async () => {
        await alerting.clickV2RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V2_URL_RE);
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'false');
      });

      await test.step('from v2, switch to v1 again', async () => {
        await alerting.clickV1RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V1_URL_RE);
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'false');
      });
    });

    test('starts on v1 and keeps host-aware tabs after switching to v2 and back', async ({
      page,
      pageObjects,
    }) => {
      const alerting = pageObjects.observabilityAlerting;

      await test.step('start on v1 and switch to v2', async () => {
        await alerting.goto(OBSERVABILITY_ALERTING_RULES_V1_PATH);
        await expect(alerting.pageTitle).toHaveText('Rules', { timeout: 30_000 });
        await expect(alerting.v1RulesTab).toBeVisible();
        await expect(alerting.v2RulesTab).toBeVisible();

        await alerting.clickV2RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V2_URL_RE);
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'false');
      });

      await test.step('from v2, switch back to v1', async () => {
        await alerting.clickV1RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V1_URL_RE);
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'false');
      });
    });

    test('clicking a rule name stays on Observability Alerting', async ({ page, pageObjects }) => {
      const rules = pageObjects.observabilityClassicRules;

      await test.step('rule-name href is host-relative, not Stack Management', async () => {
        await rules.openListAndSearch(ruleName);
        await expect(rules.ruleNameLink(ruleName)).toBeVisible({ timeout: 30_000 });

        await expect(rules.ruleNameLink(ruleName)).toHaveAttribute(
          'href',
          OBS_V1_RULE_NAME_HREF_RE
        );
        await expectObservabilityHref(rules.ruleNameLink(ruleName));
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
      await rules.openListAndSearch(ruleName);
      await rules.clickRuleName(ruleName);
      await expect(rules.backLink).toBeVisible({ timeout: 30_000 });

      await test.step('back href stays on the observability list, not /rules/v1/rules', async () => {
        await expect(rules.backLink).toHaveAttribute('href', OBS_V1_LIST_HREF_RE);
        await expectObservabilityHref(rules.backLink);
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
        await expect(rules.backLink).toHaveAttribute('href', OBS_V1_LIST_HREF_RE);
        await expectObservabilityHref(rules.backLink);
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

    test('list page omits the Alerts back link on the Observability mount', async ({
      pageObjects,
    }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto();
      await expect(rules.rulesList).toBeVisible({ timeout: 30_000 });
      await expect(rules.backLink).toHaveCount(0);
    });

    test('click-through list, details, tabs, edit, and back stays on Observability Alerting', async ({
      page,
      pageObjects,
    }) => {
      const rules = pageObjects.observabilityClassicRules;

      await test.step('list rule-name href is createHref on the observability mount', async () => {
        await rules.openListAndSearch(ruleName);
        await expect(rules.ruleNameLink(ruleName)).toBeVisible({ timeout: 30_000 });
        await expect(rules.ruleNameLink(ruleName)).toHaveAttribute(
          'href',
          OBS_V1_RULE_NAME_HREF_RE
        );
        await expectObservabilityHref(rules.ruleNameLink(ruleName));
      });

      await test.step('click the rule name onto details', async () => {
        await rules.clickRuleName(ruleName);
        await expect(rules.pageTitle).toBeVisible({ timeout: 30_000 });
        await expectObservabilityHost(page, OBS_V1_DETAILS_URL_RE);
      });

      await test.step('details back href is createHref to the observability list', async () => {
        await expect(rules.backLink).toBeVisible();
        await expect(rules.backLink).toHaveAttribute('href', OBS_V1_LIST_HREF_RE);
        await expectObservabilityHref(rules.backLink);
      });

      await test.step('alerts and history tabs stay on the observability details URL', async () => {
        await expect(rules.ruleDetailsTabs).toBeVisible({ timeout: 30_000 });
        await rules.clickHistoryTab();
        await expectObservabilityHost(page, OBS_V1_DETAILS_URL_RE);
        await rules.clickAlertsTab();
        await expectObservabilityHost(page, OBS_V1_DETAILS_URL_RE);
      });

      await test.step('edit from details stays on the observability mount', async () => {
        await rules.openEditFromDetails();
        await expectObservabilityHost(page, OBS_V1_EDIT_URL_RE);
        await expect(page).toHaveURL(new RegExp(`/edit/${ruleId}(/|$|\\?|#)`));
      });

      await test.step('cancel returns to observability details, back returns to the list', async () => {
        await rules.clickCancel();
        await expect(rules.pageTitle).toBeVisible({ timeout: 30_000 });
        await expectObservabilityHost(page, OBS_V1_DETAILS_URL_RE);
        await expect(page).toHaveURL(new RegExp(`/rule/${ruleId}(/|$|\\?|#)`));

        await rules.clickBack();
        await expect(rules.rulesList).toBeVisible();
        await expectObservabilityHost(page, OBS_V1_LIST_URL_RE);
      });
    });

    test('settings from logs does not leave Observability Alerting', async ({
      page,
      pageObjects,
    }) => {
      const rules = pageObjects.observabilityClassicRules;
      await rules.goto();
      await expect(rules.rulesList).toBeVisible({ timeout: 30_000 });
      await rules.clickLogsMenuItem();
      await expect(rules.pageTitle).toHaveText('Logs', { timeout: 30_000 });
      await expectObservabilityHost(page, OBS_V1_LOGS_URL_RE);

      await test.step('open settings without changing the logs URL', async () => {
        await rules.openSettingsFlyout();
        await expect(rules.settingsFlyout).toBeVisible();
        await expectObservabilityHost(page, OBS_V1_LOGS_URL_RE);
      });

      await test.step('close settings and stay on observability logs', async () => {
        await rules.closeSettingsFlyout();
        await expect(rules.settingsFlyout).toBeHidden();
        await expectObservabilityHost(page, OBS_V1_LOGS_URL_RE);
      });
    });

    test('stays on Observability Alerting when selecting a template', async ({
      page,
      pageObjects,
    }) => {
      const rules = pageObjects.observabilityClassicRules;

      await rules.goto();
      await expect(rules.createButton).toBeVisible({ timeout: 30_000 });
      await rules.openCreateRuleTypeModal();
      await rules.selectTemplate(templateId, templateName);

      await expect(page).toHaveURL(OBS_V1_CREATE_URL_RE);
      await expect(page).not.toHaveURL(OBS_V1_NESTED_RULES_URL_RE);
      await expect(page).not.toHaveURL(MANAGEMENT_CLASSIC_RULES_URL_RE);
      await expect(page).not.toHaveURL(STANDALONE_RULES_APP_URL_RE);
      await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_URL_RE);
      expect(page.url()).toContain(`/create/template/${templateId}`);
    });
  }
);
