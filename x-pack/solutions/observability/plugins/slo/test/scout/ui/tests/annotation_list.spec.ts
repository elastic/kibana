/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

test.describe('Annotations List', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ sloData }) => {
    await sloData.generateSloData();
    await sloData.addSLO();
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.annotations.goto();
  });

  test('create an annotation', async ({ page }) => {
    await page.click('text="Create annotation"');
    await page.getByTestId('annotationTitle').fill('Test annotation');
    await page.getByTestId('annotationTitle').blur();
    await page.getByTestId('annotationMessage').fill('Test annotation description');
    await page.getByTestId('annotationMessage').blur();
    await page.getByTestId('annotationTags').click();
    await page.getByTestId('sloSelector').getByTestId('comboBoxSearchInput').click();
    await page.click('text="All SLOs"');
    await page.click('text=Save');
    await page.getByTestId('toastCloseButton').click();
  });

  test('validate annotation list', async ({ page }) => {
    await expect(
      page.locator('[data-test-subj="annotation-marker-body"]:has-text("Test annotation")')
    ).toBeVisible();
    await expect(page.locator('.euiTableRow')).toHaveCount(1);
    await page.locator('.echAnnotation__marker').hover();
    await expect(
      page.locator(
        '[data-test-subj="annotation-tooltip-description"]:has-text("Test annotation description")'
      )
    ).toBeVisible();
  });

  test('Go to slos', async ({ page }) => {
    await page.getByTestId('observability-nav-slo-slos').click();
    await page.click('text="Test Stack SLO"');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  });

  test('check that annotation is displayed', async ({ page }) => {
    await page.getByRole('button', { name: 'Test annotation description' }).hover();
    await expect(
      page.locator(
        '[data-test-subj="annotation-tooltip-description"]:has-text("Test annotation description")'
      )
    ).toBeVisible();
  });

  test('update annotation', async ({ page }) => {
    await page.getByRole('button', { name: 'Test annotation description' }).click();
    await page.getByTestId('annotationTitle').fill('Updated annotation');
    await page.getByTestId('annotationTitle').blur();
    await page.getByTestId('annotationMessage').fill('Updated annotation description');
    await page.getByTestId('annotationMessage').blur();
    await page.getByTestId('annotationSaveButton').click();
    await page.getByTestId('toastCloseButton').click();
    await expect(
      page.locator('[data-test-subj="annotation-marker-body"]:has-text("Updated annotation")')
    ).toBeVisible();
    await page.getByRole('button', { name: 'Updated annotation description' }).hover();
    await expect(
      page.locator(
        '[data-test-subj="annotation-tooltip-description"]:has-text("Updated annotation description")'
      )
    ).toBeVisible();
  });

  test('delete annotation', async ({ page }) => {
    await page.getByRole('button', { name: 'Updated annotation description' }).click();
    await page.getByTestId('annotationDeleteButton').click();
    await page.getByTestId('toastCloseButton').click();
    await expect(page.locator('.echAnnotation__marker')).toHaveCount(0);
  });
});
