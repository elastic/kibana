/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { test, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { DX_NAV_ENTRY, LEGACY_UX_NAV_ENTRY } from '../fixtures/constants';

// An existing APM user that was never granted Digital Experience.
const APM_ONLY_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { apm: ['read'] }, spaces: ['*'] }],
};

test.describe(
  'Digital Experience without the digital_experience privilege',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(APM_ONLY_ROLE);
    });

    test('keeps the legacy User Experience navigation and hides Digital Experience', async ({
      page,
      kbnUrl,
    }) => {
      await page.goto(kbnUrl.get('/app/ux'));

      await expect(page.testSubj.locator(LEGACY_UX_NAV_ENTRY)).toBeVisible();
      await expect(page.testSubj.locator(DX_NAV_ENTRY)).toBeHidden();
    });
  }
);
