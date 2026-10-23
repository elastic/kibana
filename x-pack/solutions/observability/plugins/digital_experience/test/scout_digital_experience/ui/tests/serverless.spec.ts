/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_SERVERLESS_TAGS } from '../../tags';

const isClassicRumRequest = (url: string): boolean => /\/internal\/(apm|ux)\//.test(url);

test.describe(
  'Digital Experience on serverless',
  { tag: DIGITAL_EXPERIENCE_SERVERLESS_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('shows in the project nav without requesting Classic RUM data', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      const classicRumRequests: string[] = [];
      page.on('request', (request) => {
        if (isClassicRumRequest(request.url())) {
          classicRumRequests.push(request.url());
        }
      });

      await test.step('shows that applications are unavailable', async () => {
        await digitalExperience.gotoApplications();

        await expect(digitalExperience.projectNavEntry).toBeVisible();
        await expect(digitalExperience.applicationsUnavailable).toBeVisible();
      });

      await test.step('shows no Overview', async () => {
        await digitalExperience.gotoApplication(testData.SERVICE_NAME);

        await expect(digitalExperience.overviewEmpty).toBeVisible();
      });

      expect(classicRumRequests).toStrictEqual([]);
    });
  }
);
