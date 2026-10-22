/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

test.describe('Digital Experience access', { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.DIGITAL_EXPERIENCE_READ_ROLE);
  });

  test('opens the app for a user with the read privilege', async ({
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoApplications();

    await expect(digitalExperience.mainContainer).toBeVisible();
    await expect(digitalExperience.breadcrumbs).toContainText('Digital experience');
  });
});
