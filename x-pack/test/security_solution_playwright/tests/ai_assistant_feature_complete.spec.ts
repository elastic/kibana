/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect } from '../fixtures';

export const ftrConfigFile = {
  ftrConfig: {
    productTypes: [
      { product_line: 'security', product_tier: 'complete' },
      { product_line: 'endpoint', product_tier: 'complete' },
    ],
  },
};

test.skip(
  'App Features for Security Complete',
  {
    tag: ['@serverless'],
  },
  async ({ page }) => {
    await page.goto('/app/security/get_started');

    await expect(page.getByTestId('assistantHeaderLink')).toBeVisible();
  }
);
