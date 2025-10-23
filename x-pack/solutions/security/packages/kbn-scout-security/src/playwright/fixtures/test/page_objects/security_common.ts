/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout';
import { TIMEOUTS } from '../../../constants/timeouts';

/**
 * Common Security Solution page utilities
 */
export class SecurityCommonPage {
  constructor(private readonly page: ScoutPage) {}

  // ========================================
  // Locators - Toast Messages
  // ========================================

  public get toastHeader() {
    return this.page.testSubj.locator('euiToastHeader');
  }

  public get successToastHeader() {
    return this.page.locator('[class*="euiToast-success"] [data-test-subj="euiToastHeader"]');
  }

  public get errorToastHeader() {
    return this.page.locator('[class*="euiToast-danger"] [data-test-subj="euiToastHeader"]');
  }

  public get toastBody() {
    return this.page.testSubj.locator('globalToastList').locator('[data-test-subj="euiToastBody"]');
  }

  public get successToastBody() {
    return this.page.locator('[class*="euiToast-success"] [data-test-subj="euiToastBody"]');
  }

  public get errorToastBody() {
    return this.page.locator('[class*="euiToast-danger"] [data-test-subj="euiToastBody"]');
  }

  public get toastCloseButtons() {
    return this.page.testSubj.locator('euiToastCloseButton');
  }

  public get errorComment() {
    return this.page.testSubj.locator('errorComment');
  }

  // ========================================
  // Onboarding Modal
  // ========================================

  /**
   * Dismisses onboarding modals that may appear after navigation.
   * Should be called after navigating to Security pages that show onboarding tours.
   *
   * @example
   * ```typescript
   * await page.gotoApp('security', { path: '/rules' });
   * await pageObjects.securityCommon.dismissOnboardingModal();
   * ```
   */
  async dismissOnboardingModal() {
    // Check if modal is present without throwing
    const modalOkButton = this.page.getByRole('button', { name: 'OK' });
    if (await modalOkButton.isVisible({ timeout: TIMEOUTS.UI_ELEMENT_SHORT })) {
      await modalOkButton.click();
      // Wait for modal to close
      await modalOkButton.waitFor({ state: 'hidden', timeout: TIMEOUTS.UI_ELEMENT_SHORT });
    }
    // If modal is not present, continue silently
  }

  // ========================================
  // Toast Management
  // ========================================

  /**
   * Dismisses any notification toasts that may be blocking the UI.
   * Useful after operations that show success/error toasts.
   */
  async dismissToasts() {
    const count = await this.toastCloseButtons.count();

    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line playwright/no-nth-methods
      const button = this.toastCloseButtons.nth(i);
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
      }
    }
  }

  /**
   * Dismisses a specific toast by index
   * @param index - The index of the toast to dismiss (0-based)
   */
  async dismissToast(index: number = 0) {
    // eslint-disable-next-line playwright/no-nth-methods
    const button = this.toastCloseButtons.nth(index);
    if (await button.isVisible({ timeout: 1000 })) {
      await button.click();
    }
  }

  // ========================================
  // Toast Assertions
  // ========================================

  /**
   * Asserts that a success toast is visible
   */
  async expectSuccessToast() {
    await expect(this.successToastHeader).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
  }

  /**
   * Asserts that a success toast with a specific message is visible
   * @param message - The expected message in the toast body
   */
  async expectSuccessToastWithMessage(message: string) {
    await expect(this.successToastHeader).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await expect(this.successToastBody).toContainText(message);
  }

  /**
   * Asserts that an error toast is visible
   */
  async expectErrorToast() {
    await expect(this.errorToastHeader).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
  }

  /**
   * Asserts that an error toast with a specific message is visible
   * @param message - The expected message in the toast body
   */
  async expectErrorToastWithMessage(message: string) {
    await expect(this.errorToastHeader).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await expect(this.errorToastBody).toContainText(message);
  }

  /**
   * Asserts that an error comment element is visible
   * Commonly used for API error responses in the UI
   */
  async expectErrorComment() {
    await expect(this.errorComment).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
  }

  /**
   * Asserts that an error comment with specific text is visible
   * @param message - The expected error message
   */
  async expectErrorCommentWithMessage(message: string) {
    await expect(this.errorComment).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await expect(this.errorComment).toContainText(message);
  }

  /**
   * Asserts that a toast with specific text is visible
   * @param message - The expected message in any toast
   */
  async expectToastWithMessage(message: string) {
    await expect(this.toastBody).toContainText(message);
  }

  /**
   * Asserts that no toasts are visible
   */
  async expectNoToasts() {
    await expect(this.toastHeader).toBeHidden();
  }
}
