/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe(
  'Hosts Page - Empty State',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test('should show onboarding page when no data is present', async ({
      browserAuth,
      pageObjects: { hostsPage },
    }) => {
      await browserAuth.loginAsViewer();

      await test.step('navigate to hosts view without any data', async () => {
        await hostsPage.goToHostsPage();
      });

      await test.step('verify the onboarding page is shown', async () => {
        await expect(hostsPage.noDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      });
    });
  }
);
