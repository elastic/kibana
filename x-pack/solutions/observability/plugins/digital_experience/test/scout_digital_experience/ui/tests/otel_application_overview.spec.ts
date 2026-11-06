/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

// EDOT Browser applications need no ux plugin, so these run on serverless too.
test.describe(
  'Digital Experience EDOT Browser application',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('shows the pages, browsers and clicks of the EDOT Browser application', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });

      await expect(digitalExperience.otelOverviewTopPages).toContainText('/products');
      await expect(digitalExperience.otelOverviewTopPages).toContainText('1.20 s');
      await expect(digitalExperience.otelOverviewBreakdowns).toContainText('Safari');
      await expect(digitalExperience.otelOverviewBreakdowns).toContainText('Mobile');
      await expect(digitalExperience.otelOverviewTopClicks).toContainText('#add-to-cart');
    });

    test('shows the top errors on the Overview, linked to the Errors tab', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });

      await expect(digitalExperience.errorsPanel).toContainText('x is undefined');
      await digitalExperience.errorsViewAll.click();

      await expect(page).toHaveURL(/\/otel-shop\/errors/);
      await expect(digitalExperience.errorsPanel).toContainText('x is undefined');
    });

    test('shows the error groups on the Errors tab, with the stack trace in a flyout', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await digitalExperience.errorsTab.click();

      await expect(digitalExperience.errorsPanel).toContainText('x is undefined');
      await digitalExperience.errorsPanel.getByRole('button', { name: 'TypeError' }).click();
      await expect(digitalExperience.errorFlyout).toContainText('at checkout (app.js:10:5)');
    });

    test('shows the requests and the render-blocking resources on the Network tab', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await digitalExperience.networkTab.click();

      await expect(digitalExperience.networkHttpRequests).toContainText(
        'https://otel-shop.example.com/api/checkout'
      );
      await expect(digitalExperience.networkHttpRequests).toContainText('100% (1)');
      await expect(digitalExperience.networkSlowestResources).toContainText('app.js');
      await expect(digitalExperience.networkSlowestResources).toContainText('Render-blocking');
    });

    test('keeps the EDOT Browser Overview headings in order', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(
        digitalExperience.otelOverviewVitals.getByRole('heading', {
          level: 2,
          name: 'Core web vitals',
        })
      ).toBeVisible();

      // `page.checkA11y` only reports serious and critical violations, and heading-order is moderate.
      const { violations } = await new AxeBuilder({ page })
        .include('main')
        .withRules(['heading-order'])
        .analyze();
      expect(violations).toStrictEqual([]);
    });
  }
);
