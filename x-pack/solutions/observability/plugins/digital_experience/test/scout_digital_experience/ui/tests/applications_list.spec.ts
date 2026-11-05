/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

const { SERVICE_NAME, OTEL_APPS, STAGING_ENVIRONMENT, TIME_RANGE } = testData;

// The metrics of each application are asserted by the applications API specs.
test.describe(
  'Digital Experience applications list',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { digitalExperience } }) => {
      await browserAuth.loginAsViewer();
      await digitalExperience.gotoApplications();
    });

    test('lists the applications of both sources and narrows them with the filters', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await test.step('shows the summary and the page loads over time', async () => {
        await expect(digitalExperience.summary).toBeVisible();
        // The chart's figure wraps a canvas drawn over it, so it's attached but has no size of its own.
        await expect(digitalExperience.pageLoadsChart.getByRole('figure')).toBeAttached();
      });

      await test.step('shows one EDOT Browser row with a hint for a name with both sources', async () => {
        await expect(digitalExperience.applicationRow(SERVICE_NAME)).toContainText('EDOT Browser');
        await expect(digitalExperience.classicDataHint(SERVICE_NAME)).toBeVisible();
      });

      await test.step('lists only the Classic RUM rows by source, and both again', async () => {
        await digitalExperience.selectSource('Classic RUM');

        await expect(page).toHaveURL(/sourceFilter=classic/);
        await expect(digitalExperience.applicationRow(SERVICE_NAME)).toContainText('Classic RUM');
        await expect(digitalExperience.applicationLink(OTEL_APPS.shop)).toBeHidden();

        await digitalExperience.selectSource('All sources');

        await expect(page).not.toHaveURL(/sourceFilter=/);
        await expect(digitalExperience.applicationLink(OTEL_APPS.shop)).toBeVisible();
      });

      await test.step('searches the applications by name', async () => {
        await digitalExperience.search.fill('checkout');

        await expect(digitalExperience.applicationLink(OTEL_APPS.checkout)).toBeVisible();
        await expect(digitalExperience.applicationLink(OTEL_APPS.shop)).toBeHidden();

        await digitalExperience.search.fill('');

        await expect(digitalExperience.applicationLink(OTEL_APPS.shop)).toBeVisible();
      });

      await test.step('lists only the selected environment, "Not defined", and all again', async () => {
        await digitalExperience.selectEnvironment(STAGING_ENVIRONMENT);

        await expect(page).toHaveURL(new RegExp(`environment=${STAGING_ENVIRONMENT}`));
        await expect(digitalExperience.applicationLink(OTEL_APPS.docs)).toBeVisible();
        await expect(digitalExperience.applicationLink(OTEL_APPS.shop)).toBeHidden();

        await digitalExperience.selectEnvironment('Not defined');

        await expect(page).toHaveURL(/environment=ENVIRONMENT_NOT_DEFINED/);
        await expect(digitalExperience.applicationLink(OTEL_APPS.blog)).toBeVisible();
        await expect(digitalExperience.applicationLink(OTEL_APPS.docs)).toBeHidden();

        await digitalExperience.selectEnvironment('All');

        await expect(page).not.toHaveURL(/environment=/);
        await expect(digitalExperience.applicationLink(OTEL_APPS.shop)).toBeVisible();
      });

      await test.step('removes an invalid source from the URL and lists every source', async () => {
        await digitalExperience.gotoApplications({ ...TIME_RANGE, sourceFilter: 'invalid' });

        await expect(page).not.toHaveURL(/sourceFilter=/);
        await expect(digitalExperience.applicationLink(OTEL_APPS.shop)).toBeVisible();
      });
    });
  }
);
