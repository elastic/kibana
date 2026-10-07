/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import { APP_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';

/**
 * Rule details page (`/security/rules/id/<id>`): the About, Definition and Schedule sections,
 * the execution status, the actions menu and the alerts tab.
 */
export class RuleDetailsPage {
  readonly header: Locator;
  readonly aboutSection: Locator;
  readonly definitionSection: Locator;
  readonly scheduleSection: Locator;
  readonly description: Locator;
  readonly investigationNotesToggle: Locator;
  readonly investigationNotes: Locator;
  readonly alertsTab: Locator;
  readonly actionsMenuButton: Locator;
  readonly duplicateMenuItem: Locator;
  readonly confirmModalButton: Locator;
  readonly backToRuleDetailsLink: Locator;
  readonly alertsCount: Locator;
  readonly alertRuleNameCells: Locator;
  readonly alertSeverityCells: Locator;
  readonly alertRiskScoreCells: Locator;
  readonly investigateInTimelineButtons: Locator;

  constructor(private readonly page: ScoutPage) {
    this.header = this.page.testSubj.locator('header-page-title');
    this.aboutSection = this.page.testSubj.locator('aboutRule');
    this.definitionSection = this.page.testSubj.locator('definitionRule');
    this.scheduleSection = this.page.testSubj.locator('schedule');
    this.description = this.page.testSubj.locator('stepAboutRuleDetailsToggleDescriptionText');
    this.investigationNotesToggle = this.page.testSubj.locator('stepAboutDetailsToggle-notes');
    this.investigationNotes = this.page.testSubj.locator('stepAboutDetailsNoteContent');
    this.alertsTab = this.page.testSubj.locator('navigation-alerts');
    this.actionsMenuButton = this.page.testSubj.locator('rules-details-popover-button-icon');
    this.duplicateMenuItem = this.page.testSubj.locator('rules-details-duplicate-rule');
    this.confirmModalButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.backToRuleDetailsLink = this.page.testSubj.locator('ruleEditBackToRuleDetails');
    this.alertsCount = this.page.testSubj.locator('toolbar-alerts-count');
    this.alertRuleNameCells = this.page.testSubj.locator('formatted-field-kibana.alert.rule.name');
    this.alertSeverityCells = this.page.testSubj.locator('formatted-field-kibana.alert.severity');
    this.alertRiskScoreCells = this.page.testSubj.locator(
      'formatted-field-kibana.alert.risk_score'
    );
    this.investigateInTimelineButtons = this.page.testSubj.locator('send-alert-to-timeline-button');
  }

  async goto(params: {
    kbnUrl: KibanaUrl;
    spaceId: string;
    ruleId: string;
    tab?: 'alerts';
  }): Promise<void> {
    const { kbnUrl, spaceId, ruleId, tab } = params;
    await this.page.goto(
      kbnUrl.app(`security/rules/id/${ruleId}${tab ? `/${tab}` : ''}`, { space: spaceId })
    );
    await this.header.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
  }

  /** The value shown next to a title of a details list, e.g. `Severity` or `Rule type`. */
  detailValue(section: Locator, title: string): Locator {
    return section
      .getByRole('term')
      .filter({ hasText: new RegExp(`^${title}$`) })
      .locator('xpath=following-sibling::dd[1]');
  }

  async openAlertsTab(): Promise<void> {
    await this.alertsTab.click();
  }

  /** Duplicates the rule from the actions menu and confirms the dialog. */
  async duplicateFromActionsMenu(): Promise<void> {
    await this.actionsMenuButton.click();
    await this.duplicateMenuItem.click();
    await this.confirmModalButton.click();
  }
}
