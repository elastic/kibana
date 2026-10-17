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
  'Digital Experience application overview',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('renders the Classic RUM dashboard of the application', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.SERVICE_NAME);

      await expect(digitalExperience.overviewTab).toBeVisible();
      await expect(digitalExperience.breadcrumbs).toContainText('Overview');
      await expect(digitalExperience.classicRumPageLoadMetric).toBeVisible();
      await expect(digitalExperience.classicRumServiceSelect).toBeHidden();
    });
  }
);
