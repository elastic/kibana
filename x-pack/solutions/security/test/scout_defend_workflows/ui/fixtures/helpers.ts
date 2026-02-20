/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import type { Page } from '@playwright/test';

/**
 * Get a Playwright locator for a data-test-subj value (Kibana test subject).
 */
export const getByTestSubj = (page: Page, selector: string) => {
  return page.locator(testSubjSelector(selector));
};

/**
 * Wait for the global loading indicator to be hidden (page ready).
 */
export const waitForPageToBeLoaded = async (page: Page): Promise<void> => {
  await page.locator(testSubjSelector('globalLoadingIndicator-hidden')).waitFor({ state: 'visible' });
};
