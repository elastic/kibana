/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, expect } from '@elastic/synthetics';
import { AnnotationDataService } from '../services/annotation_data_service';
import { SLoDataService } from '../services/slo_data_service';
import { sloAppPageProvider } from '../page_objects/slo_app';

journey(`AnnotationsList`, async ({ page, params }) => {
  const sloApp = sloAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const dataService = new SLoDataService({
    kibanaUrl: params.kibanaUrl,
    elasticsearchUrl: params.elasticsearchUrl,
    getService: params.getService,
  });

  const annotationService = new AnnotationDataService(params);

  before(async () => {
    await dataService.generateSloData();
    await dataService.addSLO();
    await annotationService.deleteAnnotationsIndex();
  });

  step('Go to slos overview', async () => {
    await page.goto(`${params.kibanaUrl}/app/observability/annotations`, {
      waitUntil: 'networkidle',
    });
    await sloApp.loginToKibana();
  });

  step('create an annotation', async () => {
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

  step('validate annotation list', async () => {
    await page.waitForSelector('text="Test annotation"');
    await expect(await page.locator('.euiTableRow')).toHaveCount(1);

    await page.locator('.echAnnotation__marker').first().hover();
    await page.waitForSelector('text="Test annotation description"');
  });

  step('Go to slos', async () => {
    await page.getByTestId('observability-nav-slo-slos').click();

    await page.click('text="Test Stack SLO"');

    // scroll to the bottom of the page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  });

  step('check that annotation is displayed', async () => {
    await page.locator('.echAnnotation__marker').nth(1).hover();
    await page.waitForSelector('text="Test annotation description"');
  });

  step('update annotation', async () => {
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

  step('delete annotation', async () => {
    await page.locator('.echAnnotation__marker').nth(1).click();
    await page.getByTestId('annotationDeleteButton').first().click();

    await page.getByTestId('toastCloseButton').click();

    await expect(await page.locator('.echAnnotation__marker')).toHaveCount(1);
  });
});
