/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { AnnotationDataService } from '../services/annotation_data_service';
import { SLODataService } from '../services/slo_data_service';
import { test } from '../fixtures';

test.describe('Annotations List', { tag: ['@ess', '@svlOblt'] }, () => {
  let dataService: SLODataService;
  let annotationService: AnnotationDataService;

  test.beforeAll(async ({ kbnClient, kbnUrl, config, esClient }) => {
    dataService = new SLODataService(kbnUrl.toString(), config.hosts.elasticsearch, kbnClient);
    annotationService = new AnnotationDataService(esClient);

    await dataService.generateSloData();
    await dataService.addSLO();
    await annotationService.deleteAnnotationsIndex();
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
    await page.waitForSelector('text="Test annotation"');
    await expect(await page.locator('.euiTableRow')).toHaveCount(1);
    await page.locator('.echAnnotation__marker').first().hover();
    await page.waitForSelector('text="Test annotation description"');
  });

  test('Go to slos', async ({ page }) => {
    await page.getByTestId('observability-nav-slo-slos').click();
    await page.click('text="Test Stack SLO"');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  });

  test('check that annotation is displayed', async ({ page }) => {
    await page.locator('.echAnnotation__marker').nth(1).hover();
    await page.waitForSelector('text="Test annotation description"');
  });

  test('update annotation', async ({ page }) => {
    await page.locator('.echAnnotation__marker').nth(1).click();
    await page.getByTestId('annotationTitle').fill('Updated annotation');
    await page.getByTestId('annotationTitle').blur();
    await page.getByTestId('annotationMessage').fill('Updated annotation description');
    await page.getByTestId('annotationMessage').blur();
    await page.getByTestId('annotationSaveButton').click();
    await page.getByTestId('toastCloseButton').click();
    await page.waitForSelector('text="Updated annotation"');
    await page.locator('.echAnnotation__marker').nth(1).hover();
    await page.waitForSelector('text="Updated annotation description"');
  });

  test('delete annotation', async ({ page }) => {
    await page.locator('.echAnnotation__marker').nth(1).click();
    await page.getByTestId('annotationDeleteButton').first().click();
    await page.getByTestId('toastCloseButton').click();
    await expect(await page.locator('.echAnnotation__marker')).toHaveCount(1);
  });
});
