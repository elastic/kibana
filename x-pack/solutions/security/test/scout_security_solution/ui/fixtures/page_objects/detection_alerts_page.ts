/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class DetectionAlertsPage {
  readonly alertsDataGrid: Locator;
  readonly alertsTable: Locator;
  readonly bulkActionsHeader: Locator;
  readonly selectedAlertsButton: Locator;
  readonly takeActionPopoverBtn: Locator;
  readonly addToNewCaseButton: Locator;
  readonly addToExistingCaseButton: Locator;
  readonly alertCheckbox: Locator;
  readonly alertsCount: Locator;
  readonly emptyAlertTable: Locator;
  readonly expandAlertBtn: Locator;
  readonly closeFlyoutBtn: Locator;
  readonly closeSelectedAlertsBtn: Locator;
  readonly closedAlertsFilterBtn: Locator;
  readonly openedAlertsFilterBtn: Locator;
  readonly acknowledgedAlertsFilterBtn: Locator;
  readonly selectAllAlertsButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.alertsDataGrid = this.page.testSubj.locator('euiDataGridBody');
    this.alertsTable = this.page.testSubj.locator('alertsTable');
    this.bulkActionsHeader = this.page.testSubj.locator('bulk-actions-header');
    this.selectedAlertsButton = this.page.testSubj.locator('selectedShowBulkActionsButton');
    this.takeActionPopoverBtn = this.page.testSubj.locator('selectedShowBulkActionsButton');
    this.addToNewCaseButton = this.page.testSubj.locator('attach-new-case');
    this.addToExistingCaseButton = this.page.testSubj.locator('attach-existing-case');
    this.alertCheckbox = this.page.testSubj
      .locator('bulk-actions-row-cell')
      .locator('.euiCheckbox__input');
    this.alertsCount = this.page.testSubj.locator('toolbar-alerts-count');
    this.emptyAlertTable = this.page.testSubj.locator('alertsTableEmptyState');
    this.expandAlertBtn = this.page.testSubj.locator('expand-event');
    this.closeFlyoutBtn = this.page.testSubj.locator('euiFlyoutCloseButton');
    this.closeSelectedAlertsBtn = this.page.testSubj.locator('alert-close-context-menu-item');
    this.closedAlertsFilterBtn = this.page.testSubj.locator('closedAlerts');
    this.openedAlertsFilterBtn = this.page.testSubj.locator('openAlerts');
    this.acknowledgedAlertsFilterBtn = this.page.testSubj.locator('acknowledgedAlerts');
    this.selectAllAlertsButton = this.page.testSubj.locator('selectAllAlertsButton');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('security/alerts');
  }

  async waitForAlertsToLoad(): Promise<void> {
    await this.page.testSubj
      .locator('internalAlertsPageLoading')
      .waitFor({ state: 'hidden', timeout: 60_000 });
    await this.page.testSubj
      .locator('events-container-loading-false')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async selectNumberOfAlerts(count: number): Promise<void> {
    const checkboxes = this.alertCheckbox;
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }
  }

  async selectAllVisibleAlerts(): Promise<void> {
    await this.bulkActionsHeader.first().click();
  }

  async clickTakeActionPopover(): Promise<void> {
    await this.takeActionPopoverBtn.first().click();
  }

  async getDataGridRows(): Locator {
    return this.page.locator('.euiDataGridRow');
  }
}
