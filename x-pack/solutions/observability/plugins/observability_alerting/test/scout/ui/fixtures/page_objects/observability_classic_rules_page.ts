/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import {
  OBSERVABILITY_ALERTING_BASE_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
} from '../../../../../public/constants';

const V1_BASE = `${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V1_PATH}`;
const escapeRe = (value: string) => value.replace(/\//g, '\\/');
const V1_BASE_RE = escapeRe(V1_BASE);

export const OBS_V1_LIST_URL_RE = new RegExp(`${V1_BASE_RE}\\/?(?:\\?|#|$)`);
export const OBS_V1_LOGS_URL_RE = new RegExp(`${V1_BASE_RE}\\/logs(\\/|$|\\?|#)`);
export const OBS_V1_CREATE_URL_RE = new RegExp(`${V1_BASE_RE}\\/create\\/`);
export const OBS_V1_EDIT_URL_RE = new RegExp(`${V1_BASE_RE}\\/edit\\/`);
export const OBS_V1_DETAILS_URL_RE = new RegExp(`${V1_BASE_RE}\\/rule\\/[^/?#]+`);

/** Stack Management classic (v1) Rules tree — observability host-aware nav must not land here. */
export const MANAGEMENT_CLASSIC_RULES_URL_RE =
  /\/app\/management\/insightsAndAlerting\/triggersActions(\/|$|\?|#)/;
export const STANDALONE_RULES_APP_URL_RE = /\/app\/rules(\/|$|\?|#)/;
export const MANAGEMENT_ALERTING_V2_URL_RE = /\/app\/management\/alertingV2(\/|$|\?|#)/;

/**
 * Drives the classic (v1) Rules page on the Observability Alerting mount
 * (`/app/observability/alerting/rules/v1`).
 */
export class ObservabilityClassicRulesPage {
  public readonly pageTitle: Locator;
  public readonly backLink: Locator;
  public readonly rulesList: Locator;
  public readonly createButton: Locator;
  public readonly ruleTypeModal: Locator;
  public readonly esQueryRuleTypeOption: Locator;
  public readonly ruleForm: Locator;
  public readonly cancelButton: Locator;
  public readonly searchField: Locator;
  public readonly logsLink: Locator;
  public readonly settingsLink: Locator;
  public readonly settingsFlyout: Locator;
  public readonly overflowButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.pageTitle = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.backLink = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.back);
    this.rulesList = this.page.testSubj.locator('rulesList');
    this.createButton = this.page.testSubj.locator('createRuleButton');
    this.ruleTypeModal = this.page.testSubj.locator('ruleTypeModal');
    this.esQueryRuleTypeOption = this.page.testSubj.locator('.es-query-SelectOption');
    this.ruleForm = this.page.testSubj.locator('ruleForm');
    this.cancelButton = this.page.testSubj.locator('rulePageFooterCancelButton');
    this.searchField = this.page.testSubj.locator('ruleSearchField');
    this.logsLink = this.page.testSubj.locator('rulesLogsLink');
    this.settingsLink = this.page.testSubj.locator('rulesSettingsLink');
    this.settingsFlyout = this.page.testSubj.locator('rulesSettingsFlyout');
    this.overflowButton = this.page.testSubj.locator('app-menu-overflow-button');
  }

  urlFor(subPath = ''): string {
    return this.kbnUrl.get(`${V1_BASE}${subPath}`);
  }

  async goto(subPath = ''): Promise<string> {
    await this.page.goto(this.urlFor(subPath), {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    return this.page.url();
  }

  ruleNameLink(ruleName: string): Locator {
    return this.page.testSubj.locator(`rulesListTableRowName-${ruleName}`);
  }

  async searchByName(ruleName: string): Promise<void> {
    await this.searchField.fill(ruleName);
    await this.searchField.press('Enter');
  }

  async openListAndSearch(ruleName: string): Promise<void> {
    await this.goto();
    await this.rulesList.waitFor({ state: 'visible' });
    const clearFilters = this.page.testSubj.locator('rules-list-clear-filter');
    if (await clearFilters.isVisible()) {
      await clearFilters.click();
      await clearFilters.waitFor({ state: 'hidden' });
    }
    await this.searchByName(ruleName);
  }

  async clickRuleName(ruleName: string): Promise<void> {
    await this.ruleNameLink(ruleName).click();
    await this.page.waitForURL(OBS_V1_DETAILS_URL_RE);
  }

  async clickBack(): Promise<void> {
    await this.backLink.click();
    await this.page.waitForURL(OBS_V1_LIST_URL_RE);
  }

  async openCreateRuleTypeModal(): Promise<void> {
    await this.createButton.click();
    await this.ruleTypeModal.waitFor({ state: 'visible' });
  }

  async selectEsQueryRuleType(): Promise<void> {
    await this.esQueryRuleTypeOption.click();
    await this.page.waitForURL(OBS_V1_CREATE_URL_RE);
    await this.ruleForm.waitFor({ state: 'visible' });
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
    await this.page.testSubj.locator(`checkboxSelectRow-${ruleId}`).hover();
    await this.page.testSubj.click('editActionHoverButton');
    await this.page.waitForURL(OBS_V1_EDIT_URL_RE);
    await this.ruleForm.waitFor({ state: 'visible' });
  }
}
