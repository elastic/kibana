/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

test.describe('Digital Experience navigation', { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('replaces the legacy User Experience entry in the classic navigation', async ({
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoApplications();

    await expect(digitalExperience.mainContainer).toBeVisible();
    await expect(digitalExperience.navEntry).toBeVisible();
    await expect(digitalExperience.legacyNavEntry).toBeHidden();
  });
});
