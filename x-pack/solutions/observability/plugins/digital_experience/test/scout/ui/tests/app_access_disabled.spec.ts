/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { DIGITAL_EXPERIENCE_DISABLED_TAGS } from '../../tags';

test.describe(
  'Digital Experience access when disabled',
  { tag: DIGITAL_EXPERIENCE_DISABLED_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('does not serve the app', async ({ page, kbnUrl }) => {
      await page.goto(kbnUrl.get('/app/digital_experience'));

      await expect(page.getByTestId('appNotFoundPageContent')).toBeVisible();
    });
  }
);
