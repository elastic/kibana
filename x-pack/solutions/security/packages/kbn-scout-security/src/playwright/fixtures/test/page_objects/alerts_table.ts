/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { expect } from '../../../../../ui';

const PAGE_URL = 'security/alerts';

export class AlertsTablePage {
  public detectionsAlertsWrapper: Locator;
  public alertRow: Locator;
  public alertsTable: Locator;
  public contextMenuButton: Locator;
  public actionsContextMenu: Locator;
  public runWorkflowMenuItem: Locator;
  public workflowPanel: Locator;
  public workflowIdSelect: Locator;
  public executeWorkflowButton: Locator;
  public workflowSuccessToastTitle: Locator;
  public viewWorkflowExecutionButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.detectionsAlertsWrapper = this.page.testSubj.locator('alerts-by-rule-table');
    this.alertsTable = this.page.testSubj.locator('alertsTableIsLoaded'); // Search for loaded Alerts table
    this.alertRow = this.page.testSubj.locator('alertsTableIsLoaded').locator('div.euiDataGridRow');
    this.contextMenuButton = this.page.testSubj.locator('timeline-context-menu-button');
    this.actionsContextMenu = this.page.testSubj.locator('actions-context-menu');
    this.runWorkflowMenuItem = this.page.testSubj.locator('run-workflow-action');
    this.workflowPanel = this.page.testSubj.locator('alert-workflow-context-menu-panel');
    this.workflowIdSelect = this.page.testSubj.locator('workflowIdSelect');
    this.executeWorkflowButton = this.page.testSubj.locator('execute-alert-workflow-button');
    this.workflowSuccessToastTitle = this.page.testSubj.locator('euiToastHeader__title');
    this.viewWorkflowExecutionButton = this.page.getByRole('button', {
      name: 'View workflow execution',
    });
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async openAlertContextMenu(ruleName: string) {
    const row = await this.getAlertRowByRuleName(ruleName);
    await row.getByTestId('timeline-context-menu-button').click();
  }

  async expandAlertDetailsFlyout(ruleName: string) {
    const row = await this.getAlertRowByRuleName(ruleName);
    await row.getByTestId('expand-event').click();
  }

  async openRunWorkflowPanel(ruleName: string) {
    await this.openAlertContextMenu(ruleName);
    await this.runWorkflowMenuItem.click();
  }

  async selectWorkflowByName(workflowName: string) {
    await this.workflowIdSelect.getByRole('option', { name: workflowName }).click();
  }

  async clickViewWorkflowExecutionAndWaitForNewTab() {
    const [newTab] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.viewWorkflowExecutionButton.click(),
    ]);

    return newTab;
  }

  private async getAlertRowByRuleName(ruleName: string): Promise<Locator> {
    await this.alertsTable.waitFor({ state: 'visible' });
    const ruleNameCell = this.alertsTable.getByTestId('ruleName').filter({ hasText: ruleName });
    const row = this.alertsTable.getByRole('row').filter({ has: ruleNameCell });

    await expect(
      row,
      `Alert with rule '${ruleName}' is not displayed in the alerts table`
    ).toHaveCount(1);

    return row;
  }

  async waitForDetectionsAlertsWrapper() {
    // Increased timeout to 20 seconds because this page sometimes takes longer to load
    return this.detectionsAlertsWrapper.waitFor({ state: 'visible', timeout: 20_000 });
  }
}
