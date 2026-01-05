/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import { ALERTS_PAGE_TEST_SUBJECTS, BIGGER_TIMEOUT, SHORTER_TIMEOUT } from '../constants';

export class AlertsPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(rangeFrom?: string, rangeTo?: string) {
    const params =
      rangeFrom && rangeTo ? `?_a=(rangeFrom:'${rangeFrom}',rangeTo:'${rangeTo}')` : '';
    await this.page.gotoApp(`observability/alerts${params}`);
  }

  async waitForTableToLoad() {
    // Wait for loading to disappear
    await this.page.testSubj
      .locator(ALERTS_PAGE_TEST_SUBJECTS.ALERTS_TABLE_LOADING)
      .waitFor({ state: 'hidden', timeout: BIGGER_TIMEOUT })
      .catch(() => {
        // Ignore if it doesn't exist or disappears quickly
      });

    // Wait for either table with data or empty state using race condition
    await Promise.race([
      this.page.testSubj.waitForSelector(ALERTS_PAGE_TEST_SUBJECTS.ALERTS_TABLE_LOADED, {
        state: 'visible',
        timeout: BIGGER_TIMEOUT,
      }),
      this.page.testSubj.waitForSelector(ALERTS_PAGE_TEST_SUBJECTS.ALERTS_TABLE_EMPTY_STATE, {
        state: 'visible',
        timeout: BIGGER_TIMEOUT,
      }),
    ]);
  }

  async waitForAlertRows(expectedCount: number = 1) {
    const locator = this.page.testSubj.locator(
      ALERTS_PAGE_TEST_SUBJECTS.ALERTS_TABLE_ROW_ACTION_MORE
    );
    await expect(locator).toHaveCount(expectedCount, { timeout: BIGGER_TIMEOUT });
  }

  async openActionsMenuForRow(rowIndex: number) {
    const actionsButtons = await this.page.testSubj
      .locator(ALERTS_PAGE_TEST_SUBJECTS.ALERTS_TABLE_ROW_ACTION_MORE)
      .all();

    if (rowIndex >= actionsButtons.length) {
      throw new Error(
        `Row index ${rowIndex} out of bounds. Only ${actionsButtons.length} rows found.`
      );
    }

    await actionsButtons[rowIndex].click();
    await expect(
      this.page.testSubj.locator(ALERTS_PAGE_TEST_SUBJECTS.ALERTS_TABLE_ACTIONS_MENU)
    ).toBeVisible();
  }

  async isAddToNewCaseActionVisible() {
    return this.page.testSubj.locator(ALERTS_PAGE_TEST_SUBJECTS.ADD_TO_NEW_CASE_ACTION).isVisible();
  }

  async isAddToExistingCaseActionVisible() {
    return this.page.testSubj
      .locator(ALERTS_PAGE_TEST_SUBJECTS.ADD_TO_EXISTING_CASE_ACTION)
      .isVisible();
  }

  async isCreateCaseFlyoutVisible() {
    // Check for either flyout or modal version (different deployments use different components)
    const flyout = this.page.testSubj.locator(ALERTS_PAGE_TEST_SUBJECTS.CREATE_CASE_FLYOUT);
    const modal = this.page.testSubj.locator(ALERTS_PAGE_TEST_SUBJECTS.CREATE_CASE_MODAL);

    const isFlyoutVisible = await flyout.isVisible().catch(() => false);
    const isModalVisible = await modal.isVisible().catch(() => false);

    return isFlyoutVisible || isModalVisible;
  }

  async isAddToExistingCaseModalVisible() {
    const modal = this.page.testSubj.locator(ALERTS_PAGE_TEST_SUBJECTS.ALL_CASES_MODAL);
    try {
      await modal.waitFor({ state: 'visible', timeout: SHORTER_TIMEOUT });
      return true;
    } catch {
      return false;
    }
  }

  async clickAddToNewCase() {
    await this.page.testSubj.locator(ALERTS_PAGE_TEST_SUBJECTS.ADD_TO_NEW_CASE_ACTION).click();
  }

  async clickAddToExistingCase() {
    await this.page.testSubj.locator(ALERTS_PAGE_TEST_SUBJECTS.ADD_TO_EXISTING_CASE_ACTION).click();
  }

  async closeFlyout() {
    // Try to close either flyout or modal
    const flyoutCloseButton = this.page.testSubj.locator('euiFlyoutCloseButton');
    const createCaseModal = this.page.testSubj.locator(ALERTS_PAGE_TEST_SUBJECTS.CREATE_CASE_MODAL);
    const createCaseCancelButton = this.page.testSubj.locator(
      ALERTS_PAGE_TEST_SUBJECTS.CREATE_CASE_CANCEL
    );

    const isFlyout = await flyoutCloseButton.isVisible().catch(() => false);
    const isModal = await createCaseModal.isVisible().catch(() => false);

    if (isFlyout) {
      await flyoutCloseButton.click();
      await expect(flyoutCloseButton).toBeHidden();
    } else if (isModal) {
      // Cancel button works for both modal and flyout
      await createCaseCancelButton.click();
      await expect(createCaseModal).toBeHidden();
    }
  }
}
