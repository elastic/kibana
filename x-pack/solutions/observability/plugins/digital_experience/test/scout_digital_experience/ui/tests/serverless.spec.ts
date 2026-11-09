/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_SERVERLESS_TAGS } from '../../tags';

const { SERVICE_NAME, OTEL_APPS, OTEL_SHOP_PAGE_LOADS } = testData;

const isClassicRumRequest = (url: string): boolean => /\/internal\/(apm|ux)\//.test(url);

test.describe(
  'Digital Experience on serverless',
  { tag: DIGITAL_EXPERIENCE_SERVERLESS_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('lists only EDOT Browser applications without requesting Classic RUM data', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      const classicRumRequests: string[] = [];
      page.on('request', (request) => {
        if (isClassicRumRequest(request.url())) {
          classicRumRequests.push(request.url());
        }
      });

      await test.step('lists the EDOT Browser applications and no Classic one', async () => {
        await digitalExperience.gotoApplications();

        await expect(digitalExperience.projectNavEntry).toBeVisible();
        await expect(digitalExperience.applicationLink(OTEL_APPS.shop)).toBeVisible();
        await expect(digitalExperience.applicationLink(OTEL_APPS.checkout)).toBeVisible();
        // The name has Classic RUM data on stateful only; here it's only its EDOT Browser row.
        await expect(digitalExperience.applicationRow(SERVICE_NAME)).toContainText('EDOT Browser');
        await expect(digitalExperience.classicDataHint(SERVICE_NAME)).toBeHidden();
        await expect(
          digitalExperience.applicationsTable.rows.filter({ hasText: 'Classic RUM' })
        ).toHaveCount(0);
        await expect(digitalExperience.sourceFilter).toBeHidden();
      });

      await test.step('opens the EDOT Browser Overview from an EDOT Browser row', async () => {
        await digitalExperience.applicationLink(OTEL_APPS.shop).click();

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(OTEL_SHOP_PAGE_LOADS);
      });

      await test.step('shows no Classic Overview', async () => {
        await digitalExperience.gotoApplication(SERVICE_NAME);

        await expect(digitalExperience.overviewEmpty).toBeVisible();
      });

      expect(classicRumRequests).toStrictEqual([]);
    });
  }
);
