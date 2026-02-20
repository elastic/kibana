/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

test.describe(
  'Entity Analytics Dashboard in Serverless',
  { tag: tags.serverless.security.essentials },
  () => {
    test.beforeEach(async ({ page, browserAuth }) => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp('security/entity_analytics');
    });

    test('should display a splash screen when visited with Security essentials PLI', async ({
      page,
    }) => {
      await expect(page.getByTestId('paywallCardDescription').first()).toHaveText(
        'Entity risk scoring capability is available in our Security Complete license tier'
      );
    });
  }
);
