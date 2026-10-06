/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { OBSERVABILITY_ALERTING_BASE_PATH } from '@kbn/deeplinks-observability';
import {
  OBSERVABILITY_ALERTING_RULES_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
} from '../../../../../public/constants';

const LIST_BASE = `${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_PATH}`;
const V1_BASE = `${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V1_PATH}`;
const escapeRe = (value: string) => value.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
const LIST_BASE_RE = escapeRe(LIST_BASE);
const V1_BASE_RE = escapeRe(V1_BASE);

export const OBS_MIXED_LIST_URL_RE = new RegExp(`${LIST_BASE_RE}\\/?(?:\\?|#|$)`);
export const OBS_V1_LIST_URL_RE = OBS_MIXED_LIST_URL_RE;
export const OBS_V1_LOGS_URL_RE = new RegExp(`${V1_BASE_RE}\\/logs(\\/|$|\\?|#)`);
export const OBS_V1_CREATE_URL_RE = new RegExp(`${V1_BASE_RE}\\/create\\/`);
export const OBS_V1_EDIT_URL_RE = new RegExp(`${V1_BASE_RE}\\/edit\\/`);
export const OBS_V1_DETAILS_URL_RE = new RegExp(`${V1_BASE_RE}\\/rule\\/[^/?#]+`);
export const OBS_V1_RULE_NAME_HREF_RE = /\/observability\/alerting\/rules\/v1\/rule\//;
export const OBS_V1_LIST_HREF_RE = /\/observability\/alerting\/rules(?:\/v1)?\/?(?:\?|#|$)/;
/** `/rules/v1` is the list; an extra `/rules` segment is the old TAU redirect path. */
export const OBS_V1_NESTED_RULES_URL_RE = /\/observability\/alerting\/rules\/v1\/rules(\/|$|\?|#)/;

/** Stack Management classic (v1) Rules tree — observability host-aware nav must not land here. */
export const MANAGEMENT_CLASSIC_RULES_URL_RE =
  /\/app\/management\/insightsAndAlerting\/triggersActions(\/|$|\?|#)/;
export const STANDALONE_RULES_APP_URL_RE = /\/app\/rules(\/|$|\?|#)/;

/**
 * Drives mixed Rules list plus classic (v1) authoring on the Observability Alerting mount.
 */
export class ObservabilityClassicRulesPage {
  public readonly pageTitle: Locator;
  public readonly backLink: Locator;
  public readonly rulesList: Locator;
  public readonly createButton: Locator;
  public readonly experienceChooser: Locator;
  public readonly chooseRuleTypes: Locator;
  public readonly ruleTypeModal: Locator;
  public readonly templateModeButton: Locator;
  public readonly ruleTypeModalSearch: Locator;
  public readonly esQueryRuleTypeOption: Locator;
  public readonly ruleForm: Locator;
  public readonly cancelButton: Locator;
  public readonly searchField: Locator;
  public readonly classicSearchField: Locator;
  public readonly logsLink: Locator;
  public readonly settingsLink: Locator;
  public readonly settingsFlyout: Locator;
  public readonly overflowButton: Locator;
  public readonly editFromDetailsButton: Locator;
  public readonly alertsTab: Locator;
  public readonly historyTab: Locator;
  public readonly ruleDetailsTabs: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.pageTitle = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.backLink = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.back);
    this.rulesList = this.page.testSubj.locator('mixedRulesTable');
    this.createButton = this.page.testSubj.locator('mixedRulesCreateButton');
    this.experienceChooser = this.page.testSubj.locator('mixedRulesExperienceChooser');
    this.chooseRuleTypes = this.page.testSubj.locator('mixedRulesBrowseClassic');
    this.ruleTypeModal = this.page.testSubj.locator('ruleTypeModal');
    this.templateModeButton = this.ruleTypeModal.getByRole('button', {
      name: 'Template',
      exact: true,
    });
    this.ruleTypeModalSearch = this.page.testSubj.locator('ruleTypeModalSearch');
    this.esQueryRuleTypeOption = this.page.testSubj.locator('.es-query-SelectOption');
    this.ruleForm = this.page.testSubj.locator('ruleForm');
    this.cancelButton = this.page.testSubj.locator('rulePageFooterCancelButton');
    this.searchField = this.page.testSubj.locator('mixedRulesSearch');
    this.classicSearchField = this.page.testSubj.locator('mixedRulesClassicSearch');
    this.logsLink = this.page.testSubj.locator('rulesLogsLink');
    this.settingsLink = this.page.testSubj.locator('rulesSettingsLink');
    this.settingsFlyout = this.page.testSubj.locator('rulesSettingsFlyout');
    this.overflowButton = this.page.testSubj.locator('app-menu-overflow-button');
    this.editFromDetailsButton = this.page.testSubj.locator('openEditRuleFlyoutButton');
    this.alertsTab = this.page.testSubj.locator('ruleAlertListTab');
    this.historyTab = this.page.testSubj.locator('eventLogListTab');
    this.ruleDetailsTabs = this.page.testSubj.locator('ruleDetailsTabbedContent');
  }

  urlFor(subPath = ''): string {
    if (subPath) {
      return this.kbnUrl.get(`${V1_BASE}${subPath}`);
    }
    return this.kbnUrl.get(LIST_BASE);
  }

  async goto(subPath = ''): Promise<string> {
    await this.page.goto(this.urlFor(subPath), {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    return this.page.url();
  }

  ruleNameLink(ruleName: string): Locator {
    return this.page.getByRole('link', { name: ruleName, exact: true });
  }

  async searchByName(ruleName: string): Promise<void> {
    await this.searchField.fill(ruleName);
  }

  async openListAndSearch(ruleName: string): Promise<void> {
    await this.goto();
    await this.rulesList.waitFor({ state: 'visible', timeout: 30_000 });
    await this.searchByName(ruleName);
  }

  async clickRuleName(ruleName: string): Promise<void> {
    await this.ruleNameLink(ruleName).click();
    await this.page.waitForURL(OBS_V1_DETAILS_URL_RE);
  }

  async clickBack(): Promise<void> {
    await this.backLink.click();
    await this.page.waitForURL(OBS_MIXED_LIST_URL_RE);
  }

  async openCreateRuleTypeModal(): Promise<void> {
    await this.createButton.click();
    if (await this.experienceChooser.isVisible()) {
      await this.chooseRuleTypes.click();
    }
    await this.classicSearchField.waitFor({ state: 'visible' });
  }

  async selectEsQueryRuleType(): Promise<void> {
    await this.esQueryRuleTypeOption.click();
    await this.page.waitForURL(OBS_V1_CREATE_URL_RE);
    await this.ruleForm.waitFor({ state: 'visible' });
  }

  templateOption(templateId: string): Locator {
    return this.page.testSubj.locator(`${templateId}-SelectOption`);
  }

  async selectTemplate(templateId: string, templateName: string): Promise<void> {
    await this.templateModeButton.click();
    await this.ruleTypeModalSearch.fill(templateName);
    await this.templateOption(templateId).click();
    await this.page.waitForURL(
      new RegExp(`${V1_BASE_RE}\\/create\\/template\\/${templateId}(\\/|$|\\?|#)`)
    );
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async revealMenuItem(item: Locator): Promise<void> {
    if (await item.isVisible()) {
      return;
    }
    await this.overflowButton.click();
    await item.waitFor({ state: 'visible' });
  }

  async clickLogsMenuItem(): Promise<void> {
    await this.revealMenuItem(this.logsLink);
    await this.logsLink.click();
    await this.page.waitForURL(OBS_V1_LOGS_URL_RE);
  }

  async openSettingsFlyout(): Promise<void> {
    await this.revealMenuItem(this.settingsLink);
    await this.settingsLink.click();
    await this.settingsFlyout.waitFor({ state: 'visible' });
  }

  async closeSettingsFlyout(): Promise<void> {
    await this.page.testSubj.click('rulesSettingsFlyoutCancelButton');
    await this.settingsFlyout.waitFor({ state: 'hidden' });
  }

  async openEditFromList(ruleId: string): Promise<void> {
    await this.page.testSubj.click(`quickEditRule-${ruleId}`);
    await this.page.waitForURL(OBS_V1_EDIT_URL_RE);
    await this.ruleForm.waitFor({ state: 'visible' });
  }

  async openEditFromDetails(): Promise<void> {
    await this.editFromDetailsButton.waitFor({ state: 'visible' });
    await this.editFromDetailsButton.click();
    await this.page.waitForURL(OBS_V1_EDIT_URL_RE);
    await this.ruleForm.waitFor({ state: 'visible' });
  }

  async clickAlertsTab(): Promise<void> {
    await this.ruleDetailsTabs.waitFor({ state: 'visible' });
    await this.alertsTab.click();
  }

  async clickHistoryTab(): Promise<void> {
    await this.ruleDetailsTabs.waitFor({ state: 'visible' });
    await this.historyTab.click();
  }
}
