/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { test } from '../fixtures';

const BOOK_CATALOG_INDEX = 'book_catalog';
const STEP_TIMEOUT = 30_000;

test.describe(
  'Tutorial Runner - Sample Tutorial',
  { tag: [...tags.stateful.classic] },
  () => {
  test.beforeEach(async ({ browserAuth, pageObjects, esClient }) => {
    try {
      await esClient.indices.delete({ index: BOOK_CATALOG_INDEX });
    } catch {
      // Index may not exist yet
    }
    await browserAuth.loginAsAdmin();
    await pageObjects.gettingStarted.goto();
  });

  test.afterEach(async ({ esClient }) => {
    try {
      await esClient.indices.delete({ index: BOOK_CATALOG_INDEX });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('completes the sample tutorial end-to-end', async ({ pageObjects, page }) => {
    await test.step('select the sample tutorial', async () => {
      await pageObjects.gettingStarted.selectTutorial('sample-tutorial');
      const step0 = await pageObjects.gettingStarted.getStepPanel(0);
      await expect(step0).toBeVisible();
    });

    await test.step('execute step 0 - create index', async () => {
      await pageObjects.gettingStarted.clickStepExecute(0);
      await expect(
        page.testSubj.locator('tutorialStep-0-next')
      ).toBeVisible({ timeout: STEP_TIMEOUT });
      const explanation = await pageObjects.gettingStarted.getStepExplanation(0);
      await expect(explanation).toBeVisible();
    });

    await test.step('advance to step 1', async () => {
      await pageObjects.gettingStarted.clickStepNext(0);
      const step1 = await pageObjects.gettingStarted.getStepPanel(1);
      await expect(step1).toBeVisible();
    });

    await test.step('execute step 1 - index documents', async () => {
      await pageObjects.gettingStarted.clickStepExecute(1);
      await expect(
        page.testSubj.locator('tutorialStep-1-next')
      ).toBeVisible({ timeout: STEP_TIMEOUT });
      const explanation = await pageObjects.gettingStarted.getStepExplanation(1);
      await expect(explanation).toBeVisible();
    });

    await test.step('advance to step 2', async () => {
      await pageObjects.gettingStarted.clickStepNext(1);
      const step2 = await pageObjects.gettingStarted.getStepPanel(2);
      await expect(step2).toBeVisible();
    });

    await test.step('execute step 2 - full-text search', async () => {
      await pageObjects.gettingStarted.clickStepExecute(2);
      await expect(
        page.testSubj.locator('tutorialStep-2-next')
      ).toBeVisible({ timeout: STEP_TIMEOUT });
      const explanation = await pageObjects.gettingStarted.getStepExplanation(2);
      await expect(explanation).toBeVisible();
    });

    await test.step('advance to step 3', async () => {
      await pageObjects.gettingStarted.clickStepNext(2);
      const step3 = await pageObjects.gettingStarted.getStepPanel(3);
      await expect(step3).toBeVisible();
    });

    await test.step('execute step 3 - filtered search', async () => {
      await pageObjects.gettingStarted.clickStepExecute(3);
      await expect(
        page.testSubj.locator('tutorialStep-3-next')
      ).toBeVisible({ timeout: STEP_TIMEOUT });
      const explanation = await pageObjects.gettingStarted.getStepExplanation(3);
      await expect(explanation).toBeVisible();
    });

    await test.step('advance to step 4', async () => {
      await pageObjects.gettingStarted.clickStepNext(3);
      const step4 = await pageObjects.gettingStarted.getStepPanel(4);
      await expect(step4).toBeVisible();
    });

    await test.step('execute step 4 - aggregation (last step)', async () => {
      await pageObjects.gettingStarted.clickStepExecute(4);
      await expect(
        page.testSubj.locator('tutorialStep-4-complete')
      ).toBeVisible({ timeout: STEP_TIMEOUT });
      const explanation = await pageObjects.gettingStarted.getStepExplanation(4);
      await expect(explanation).toBeVisible();
    });

    await test.step('complete the tutorial and verify summary', async () => {
      await pageObjects.gettingStarted.clickStepComplete(4);
      const summary = await pageObjects.gettingStarted.getTutorialSummary();
      await expect(summary).toBeVisible();
      await expect(summary).toContainText('Summary');
      await expect(summary).toContainText('Learn more');
    });

    await test.step('navigate back to tutorial selector', async () => {
      await pageObjects.gettingStarted.clickTutorialBackToAll();
      await expect(
        page.testSubj.locator('tutorialCard-sample-tutorial')
      ).toBeVisible();
    });
  });
});
