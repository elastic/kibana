/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

test.describe(
  'Digital Experience navigation without the digital_experience privilege',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(testData.APM_ONLY_ROLE);
    });

    test('keeps the legacy User Experience navigation', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoLegacyUserExperience();

      await expect(digitalExperience.legacyNavEntry).toBeVisible();
      await expect(digitalExperience.navEntry).toBeHidden();
    });
  }
);
