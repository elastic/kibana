/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMenu, type EuiComboBoxObject, type ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { RULE_DETAILS_TEST_SUBJECTS, BIGGER_TIMEOUT, SHORTER_TIMEOUT } from '../constants';

export class RuleDetailsPage {
  private readonly appMenu: AppMenu;

  /**
   * The dashboards selector (combobox on edit form)
   */
  public readonly dashboardsSelector: EuiComboBoxObject;

  constructor(private readonly page: ScoutPage) {
    this.appMenu = new AppMenu(page);
    this.dashboardsSelector = page.components.comboBox(
      RULE_DETAILS_TEST_SUBJECTS.DASHBOARDS_SELECTOR
    );
  }

  /**
   * Navigates to the rule details page by rule ID
   */
  async gotoById(ruleId: string) {
    await this.page.gotoApp(`rules/rule/${ruleId}`);
    await this.page.testSubj.waitForSelector(RULE_DETAILS_TEST_SUBJECTS.RULE_DETAILS, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  /**
   * Gets the rule details page container locator
   */
  public get ruleDetailsPage() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_DETAILS);
  }

  /**
   * Gets the rule name (page title) locator
   */
  public get ruleName() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_NAME);
  }

  /**
   * Gets the rule type locator
   */
  public get ruleType() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_TYPE);
  }

  /**
   * Gets the rule status panel locator
   */
  public get ruleStatusPanel() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_STATUS_PANEL);
  }

  /**
   * Gets the rule definition locator
   */
  public get ruleDefinition() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_DEFINITION);
  }

  /**
   * Gets the actions button locator
   */
  public get actionsButton() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ACTIONS_BUTTON);
  }

  /**
   * Gets the edit rule button locator (inside actions menu)
   */
  public get editRuleButton() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.EDIT_RULE_BUTTON);
  }

  /**
   * Gets the delete rule button locator (inside actions menu)
   */
  public get deleteRuleButton() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.DELETE_RULE_BUTTON);
  }

  /**
   * Alert Summary Widget methods
   */
  public get alertSummaryWidget() {
    const page = this.page;

    return {
      /**
       * Gets the compact alert summary widget locator
       */
      get compact() {
        return page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ALERT_SUMMARY_WIDGET_COMPACT);
      },

      /**
       * Gets the active alerts count locator
       */
      get activeAlerts() {
        return page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ACTIVE_ALERT_COUNT);
      },

      /**
       * Gets the total alerts count locator
       */
      get totalAlerts() {
        return page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.TOTAL_ALERT_COUNT);
      },

      /**
       * Clicks on the active alerts count
       */
      async clickActiveAlerts() {
        await this.activeAlerts.click();
        // URL updates synchronously via search params, no navigation event
      },

      /**
       * Clicks on the total alerts count
       */
      async clickTotalAlerts() {
        await this.totalAlerts.click();
        // URL updates synchronously via search params, no navigation event
      },
    };
  }

  /**
   * Verifies the rule details page has loaded successfully
   */
  async expectRuleDetailsPageLoaded() {
    await expect(this.ruleDetailsPage).toBeVisible({ timeout: BIGGER_TIMEOUT });
    await expect(this.ruleName).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }

  /**
   * Opens the actions menu
   */
  async openActionsMenu() {
    await this.appMenu.revealItem(this.deleteRuleButton);
    await expect(this.deleteRuleButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }

  /**
   * Closes the actions menu by clicking the actions button again
   */
  async closeActionsMenu() {
    await this.actionsButton.click();
    await expect(this.deleteRuleButton).toBeHidden({ timeout: SHORTER_TIMEOUT });
  }

  /**
   * Gets the rule name input field (on edit form) locator
   */
  public get ruleNameInput() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_DETAILS_NAME_INPUT);
  }

  /**
   * Selects a dashboard in the related dashboards combobox (on edit form)
   */
  async selectRelatedDashboard(dashboardTitle: string) {
    // EUI closes the combobox popover on any ancestor scroll and only reopens it when the search
    // value changes, so re-drive the whole open-and-pick attempt until the selection sticks.
    await expect(async () => {
      await this.dashboardsSelector.setSelectedOptions([dashboardTitle], {
        timeout: SHORTER_TIMEOUT,
      });
      expect(await this.dashboardsSelector.getSelectedOptions()).toContain(dashboardTitle);
    }).toPass({ timeout: BIGGER_TIMEOUT, intervals: [1000] });
  }

  /**
   * Opens the rule edit form
   */
  async openRuleEditForm() {
    // `Edit rule` is a primary action rendered inline, so it can be clicked directly.
    await expect(this.editRuleButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.editRuleButton.click();
    await expect(this.ruleNameInput).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }
}
