/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiSelectors, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  createTestAnnotation,
  deleteTestAnnotations,
  uniqueAnnotationNames,
} from '../fixtures/annotation_helpers';

test.describe(
  'Annotations List',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      await deleteTestAnnotations(kbnClient);
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ kbnClient }) => {
      await deleteTestAnnotations(kbnClient);
    });

    test('create an annotation', async ({ page, pageObjects }) => {
      const { title, message } = uniqueAnnotationNames();
      await pageObjects.annotations.goto();

      await pageObjects.annotations.clickCreateAnnotation();
      await page.getByTestId('annotationTitle').fill(title);
      await page.getByTestId('annotationTitle').blur();
      await page.getByTestId('annotationMessage').fill(message);
      await page.getByTestId('annotationMessage').blur();
      await page.getByTestId('annotationTags').click();
      await page.getByTestId('sloSelector').getByTestId('comboBoxSearchInput').click();
      await page.click('text="All SLOs"');
      await page.getByTestId('annotationSaveButton').click();
      await page.getByTestId('toastCloseButton').click();
      await expect(
        page.locator(`[data-test-subj="annotation-marker-body"]:has-text("${title}")`)
      ).toBeVisible();
      await expect(
        page.locator(euiSelectors.basicTable.ROW_SELECTOR).filter({ hasText: title })
      ).toHaveCount(1);
      await page.getByRole('button', { name: message }).hover();
      await expect(
        page.locator(`[data-test-subj="annotation-tooltip-description"]:has-text("${message}")`)
      ).toBeVisible();
    });

    test('Go to SLOs and check that annotation is displayed', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const { title } = await createTestAnnotation(kbnClient);
      await pageObjects.annotations.goto();

      await pageObjects.slo.openFromSideMenu();
      await page.click('text="Test Stack SLO"');
      await page.testSubj
        .locator('sliChartPanel')
        .locator('.echChartContent')
        .scrollIntoViewIfNeeded();

      await expect(
        page.testSubj
          .locator('sliChartPanel')
          .locator('[data-testid="echAnnotationMarker"]')
          .filter({ hasText: title })
      ).toBeVisible();
    });

    test('update annotation', async ({ page, pageObjects, kbnClient }) => {
      const { message } = await createTestAnnotation(kbnClient);
      const updated = uniqueAnnotationNames();
      await pageObjects.annotations.goto();

      await page.getByRole('button', { name: message }).click();
      await page.getByTestId('annotationTitle').fill(updated.title);
      await page.getByTestId('annotationTitle').blur();
      await page.getByTestId('annotationMessage').fill(updated.message);
      await page.getByTestId('annotationMessage').blur();
      await page.getByTestId('annotationSaveButton').click();
      await page.getByTestId('toastCloseButton').click();
      await expect(
        page.locator(`[data-test-subj="annotation-marker-body"]:has-text("${updated.title}")`)
      ).toBeVisible();
      await page.getByRole('button', { name: updated.message }).hover();
      await expect(
        page.locator(
          `[data-test-subj="annotation-tooltip-description"]:has-text("${updated.message}")`
        )
      ).toBeVisible();
    });

    test('delete annotation', async ({ page, pageObjects, kbnClient }) => {
      const { message } = await createTestAnnotation(kbnClient);
      await pageObjects.annotations.goto();

      await page.getByRole('button', { name: message }).click();
      await page.getByTestId('annotationDeleteButton').click();
      await page.getByTestId('toastCloseButton').click();
      await expect(page.getByRole('button', { name: message })).toBeHidden();
    });
  }
);
