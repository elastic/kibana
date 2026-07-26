/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('OverviewSaveLensVisualization', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test('opens save lens visualization modal with correct attributes', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('create test monitor via API', async () => {
      await syntheticsServices.addMonitor('Test Overview Save Lens Visualization Monitor', {
        type: 'http',
        urls: 'https://www.google.com',
      });
      await pageObjects.syntheticsApp.refreshOverview();
    });

    await test.step('open save lens visualization', async () => {
      const sparklines = page.testSubj.locator('overviewErrorsSparklines');
      await sparklines.locator('[data-test-subj="embeddablePanelHoverActions-"]').hover();
      await sparklines.locator('[data-test-subj="embeddablePanelToggleMenuIcon"]').click();
      await page.testSubj.click('embeddablePanelAction-expViewSave');
    });

    await test.step('verify prefilled attributes', async () => {
      await expect(page.testSubj.locator('savedObjectTitle')).toHaveValue(
        'Prefilled from exploratory view app'
      );
    });
  });
});
