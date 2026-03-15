/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

export class RuleGapsPage {
  readonly page: ScoutPage;

  /* Gaps overview */
  readonly gapsOverviewPanel: Locator;
  readonly autoFillStatusBadge: Locator;

  /* Gap auto-fill settings modal */
  readonly settingsModal: Locator;
  readonly settingsEnableSwitch: Locator;
  readonly settingsSaveButton: Locator;

  /* Gap auto-fill logs */
  readonly logsLink: Locator;
  readonly logsFlyout: Locator;
  readonly logsStatusFilter: Locator;
  readonly logsStatusFilterPopoverButton: Locator;
  readonly logsTable: Locator;

  /* Gap scheduler errors */
  readonly errorsCallout: Locator;
  readonly errorsLogsLink: Locator;
  readonly errorsDismissButton: Locator;

  /* Monitoring tab */
  readonly monitoringTab: Locator;
  readonly monitoringTable: Locator;

  /* Manual rule run */
  readonly manualRuleRunButton: Locator;
  readonly manualRuleRunActionButton: Locator;
  readonly confirmManualRuleRunButton: Locator;

  constructor(page: ScoutPage) {
    this.page = page;

    /* Gaps overview */
    this.gapsOverviewPanel = page.testSubj.locator('rule-with-gaps_overview-panel');
    this.autoFillStatusBadge = page.testSubj.locator('gap-auto-fill-status-badge');

    /* Gap auto-fill settings modal */
    this.settingsModal = page.testSubj.locator('rule-settings-modal');
    this.settingsEnableSwitch = page.testSubj.locator('rule-settings-enable-switch');
    this.settingsSaveButton = page.testSubj.locator('rule-settings-save');

    /* Gap auto-fill logs */
    this.logsLink = page.testSubj.locator('gap-fill-scheduler-logs-link');
    this.logsFlyout = page.testSubj.locator('gap-auto-fill-logs');
    this.logsStatusFilter = page.testSubj.locator('gap-auto-fill-logs-status-filter');
    this.logsStatusFilterPopoverButton = page.testSubj.locator(
      'gap-auto-fill-logs-status-filter-popoverButton'
    );
    this.logsTable = page.testSubj.locator('gap-auto-fill-logs-table');

    /* Gap scheduler errors */
    this.errorsCallout = page.testSubj.locator('gap-scheduler-errors-callout');
    this.errorsLogsLink = page.testSubj.locator('gap-scheduler-errors-logs-link');
    this.errorsDismissButton = page.testSubj.locator('euiDismissCalloutButton');

    /* Monitoring tab */
    this.monitoringTab = page.testSubj.locator('navigation-monitoring');
    this.monitoringTable = page.testSubj.locator('rules-monitoring-table');

    /* Manual rule run */
    this.manualRuleRunButton = page.testSubj.locator('rules-details-manual-rule-run');
    this.manualRuleRunActionButton = page.testSubj.locator('manualRuleRunAction');
    this.confirmManualRuleRunButton = page.testSubj
      .locator('bulkActionConfirmationModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]');
  }

  async gotoMonitoringTab(): Promise<void> {
    await this.monitoringTab.click();
    await waitForPageReady(this.page);
  }

  async waitForMonitoringToLoad(): Promise<void> {
    await this.monitoringTable.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async openGapAutoFillSettings(): Promise<void> {
    await this.autoFillStatusBadge.click();
    await this.settingsModal.waitFor({ state: 'visible' });
  }

  async enableAutoFill(): Promise<void> {
    await this.settingsEnableSwitch.check();
  }

  async disableAutoFill(): Promise<void> {
    await this.settingsEnableSwitch.uncheck();
  }

  async saveGapAutoFillSettings(): Promise<void> {
    await this.settingsSaveButton.click();
    await this.settingsModal.waitFor({ state: 'hidden' });
  }

  async openGapLogsFlyout(): Promise<void> {
    await this.logsLink.click();
    await this.logsFlyout.waitFor({ state: 'visible' });
  }

  async filterGapLogs(filter: string): Promise<void> {
    await this.logsStatusFilterPopoverButton.click();
    await this.page.getByText(filter).click();
    await this.logsStatusFilterPopoverButton.click();
  }

  getGapLogRows(): Locator {
    return this.logsTable.locator('tbody tr');
  }

  async openManualRuleRunModal(): Promise<void> {
    await this.manualRuleRunButton.click();
  }

  async fillManualRuleRunDates(start: string, end: string): Promise<void> {
    const startInput = this.page.testSubj.locator('superDatePickerAbsoluteDateInput').nth(0);
    const endInput = this.page.testSubj.locator('superDatePickerAbsoluteDateInput').nth(1);
    await startInput.fill(start);
    await endInput.fill(end);
  }

  async submitManualRuleRun(): Promise<void> {
    await this.confirmManualRuleRunButton.click();
  }
}
