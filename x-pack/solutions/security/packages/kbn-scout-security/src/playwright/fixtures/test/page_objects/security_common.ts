/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Common Security Solution page utilities
 */
export class SecurityCommonPage {
  constructor(private readonly page: ScoutPage) {}

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
    try {
      // Look for the modal OK button with a short timeout
      const modalOkButton = this.page.getByRole('button', { name: 'OK' });
      const isVisible = await modalOkButton.isVisible({ timeout: 2000 });

      if (isVisible) {
        await modalOkButton.click();
        // Wait for modal to close
        await modalOkButton.waitFor({ state: 'hidden', timeout: 2000 });
      }
    } catch (error) {
      // Modal not present or already dismissed - this is fine
      // Continue without error
    }
  }

  /**
   * Dismisses any notification toasts that may be blocking the UI.
   * Useful after operations that show success/error toasts.
   */
  async dismissToasts() {
    try {
      const toastCloseButtons = this.page.testSubj.locator('euiToastCloseButton');
      const count = await toastCloseButtons.count();

      for (let i = 0; i < count; i++) {
        const button = toastCloseButtons.nth(i);
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
        }
      }
    } catch (error) {
      // No toasts present - this is fine
    }
  }
}
