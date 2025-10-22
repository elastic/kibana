/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { TIMEOUTS } from '../../../constants/timeouts';

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
    // Check if modal is present without throwing
    const modalOkButton = this.page.getByRole('button', { name: 'OK' });
    if (await modalOkButton.isVisible({ timeout: TIMEOUTS.UI_ELEMENT_SHORT })) {
      await modalOkButton.click();
      // Wait for modal to close
      await modalOkButton.waitFor({ state: 'hidden', timeout: TIMEOUTS.UI_ELEMENT_SHORT });
    }
    // If modal is not present, continue silently
  }

  /**
   * Dismisses any notification toasts that may be blocking the UI.
   * Useful after operations that show success/error toasts.
   */
  async dismissToasts() {
    const toastCloseButtons = this.page.testSubj.locator('euiToastCloseButton');
    const count = await toastCloseButtons.count();

    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line playwright/no-nth-methods
      const button = toastCloseButtons.nth(i);
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
      }
    }
  }
}
