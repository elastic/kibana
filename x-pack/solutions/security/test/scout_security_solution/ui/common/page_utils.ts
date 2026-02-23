/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export async function waitForPageReady(page: ScoutPage): Promise<void> {
  await page.testSubj
    .locator('globalLoadingIndicator')
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
}

export async function dismissAllToasts(page: ScoutPage): Promise<void> {
  const toastList = page.testSubj.locator('globalToastList');
  const closeButtons = toastList.locator('[data-test-subj="toastCloseButton"]');
  const allButtons = await closeButtons.all();
  for (const button of allButtons) {
    await button.click().catch(() => {});
  }
  if (allButtons.length > 0) {
    await toastList
      .locator('[data-test-subj="toastCloseButton"]')
      .waitFor({ state: 'hidden', timeout: 5_000 })
      .catch(() => {});
  }
}
