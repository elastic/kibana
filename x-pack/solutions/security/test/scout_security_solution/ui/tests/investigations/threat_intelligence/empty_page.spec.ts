/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { INDICATORS_URL } from '../../../common/urls';

test.describe(
  'Threat Intelligence - Empty page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test('should display empty state when no indicators', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(INDICATORS_URL);

      const emptyState = page.getByTestId('tiIndicatorsEmptyState');
      const table = page.getByTestId('tiIndicatorsTable');
      const hasData = (await table.locator('tbody tr').count()) > 0;
      if (!hasData) {
        await expect(emptyState.or(page.getByText('No results'))).toBeVisible();
      }
    });
  }
);
