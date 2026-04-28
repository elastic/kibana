/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  EXTENDED_TIMEOUT,
} from '../../fixtures/constants';

test.describe(
  'Hosts Page - Empty State',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test('should show onboarding page when no data is present', async ({
      browserAuth,
      pageObjects: { hostsPage },
    }) => {
      await browserAuth.loginAsViewer();

      await test.step('navigate to hosts view with filters that return no rows', async () => {
        await hostsPage.goToPage({
          from: DATE_WITH_HOSTS_DATA_FROM,
          to: DATE_WITH_HOSTS_DATA_TO,
          preferredSchema: 'ecs',
        });
        await hostsPage.filterByQueryBar('host.name: "__scout_hosts_empty_state_no_such_host__"');
      });

      await test.step('verify the table empty state is shown', async () => {
        await expect(hostsPage.tableRows).toHaveCount(0);
        await expect(hostsPage.tableNoData).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      });
    });
  }
);
