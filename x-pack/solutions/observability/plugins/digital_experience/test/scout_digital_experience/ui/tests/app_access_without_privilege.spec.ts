/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

test.describe(
  'Digital Experience access without the digital_experience privilege',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(testData.APM_ONLY_ROLE);
    });

    test('does not open the app by URL', async ({ pageObjects: { digitalExperience } }) => {
      await digitalExperience.gotoApplications();

      await expect(digitalExperience.permissionDenied).toBeVisible();
    });
  }
);
