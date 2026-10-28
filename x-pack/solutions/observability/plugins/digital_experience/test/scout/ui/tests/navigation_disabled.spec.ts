/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { DIGITAL_EXPERIENCE_DISABLED_WITH_UX_TAGS } from '../../tags';

test.describe(
  'Digital Experience navigation when disabled',
  { tag: DIGITAL_EXPERIENCE_DISABLED_WITH_UX_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('keeps the legacy User Experience navigation', async ({ page, kbnUrl }) => {
      await page.goto(kbnUrl.get('/app/ux'));

      await expect(page.getByTestId('observability-nav-ux-dashboard')).toBeVisible();
      await expect(
        page.getByTestId('observability-nav-digital_experience-applications')
      ).toBeHidden();
    });
  }
);
