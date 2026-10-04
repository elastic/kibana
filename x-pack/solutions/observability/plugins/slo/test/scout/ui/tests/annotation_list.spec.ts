/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutPage } from '@kbn/scout-oblt';
import { euiSelectors, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { ALL_VALUE } from '@kbn/slo-schema';
import { test } from '../fixtures';

const ANNOTATIONS_API_PATH = '/api/observability/annotation';
const ANNOTATION_TITLE = 'SLO test annotation';
const ANNOTATION_MESSAGE = 'SLO test annotation description';
const UPDATED_ANNOTATION_TITLE = 'SLO updated annotation';
const UPDATED_ANNOTATION_MESSAGE = 'SLO updated annotation description';
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

const seedAnnotation = async (
  kbnClient: KbnClient,
  { title, message }: { title: string; message: string }
) => {
  const timestamp = new Date(Date.now() - ONE_DAY_IN_MS).toISOString();
  await kbnClient.request({
    method: 'POST',
    path: ANNOTATIONS_API_PATH,
    body: {
      '@timestamp': timestamp,
      message,
      annotation: { title, style: { icon: 'triangle' } },
      event: { start: timestamp },
      slo: { id: ALL_VALUE },
    },
  });
};

const deleteAnnotationsByTitle = async (kbnClient: KbnClient, title: string) => {
  const { data } = await kbnClient.request<{ items: Array<{ id: string }> }>({
    method: 'GET',
    path: `${ANNOTATIONS_API_PATH}/find`,
    query: { filter: JSON.stringify({ 'annotation.title.keyword': title }) },
  });

  for (const { id } of data.items ?? []) {
    await kbnClient.request({
      method: 'DELETE',
      path: `${ANNOTATIONS_API_PATH}/${id}`,
      ignoreErrors: [404],
    });
  }
};

const deleteTestAnnotations = async (kbnClient: KbnClient) => {
  await deleteAnnotationsByTitle(kbnClient, ANNOTATION_TITLE);
  await deleteAnnotationsByTitle(kbnClient, UPDATED_ANNOTATION_TITLE);
};

const expectAnnotationTooltip = async (
  page: ScoutPage,
  { title, message }: { title: string; message: string }
) => {
  const tableRow = page.locator(euiSelectors.basicTable.ROW_SELECTOR).filter({ hasText: title });
  const marker = page.getByRole('button', { name: message });
  const tooltipDescription = page.locator(
    `[data-test-subj="annotation-tooltip-description"]:has-text("${message}")`
  );

  // The chart re-mounts its marker while the save refetch settles, dropping the marker's
  // mouseenter; the pointer has to leave and re-enter the marker for the chart to re-deliver it.
  await expect(async () => {
    await tableRow.hover();
    await marker.hover();
    await expect(tooltipDescription).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000, intervals: [1_000] });
};

test.describe(
  'Annotations List',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      // Recovers leftovers from an interrupted run, which would duplicate the titles below.
      await deleteTestAnnotations(kbnClient);
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ kbnClient }) => {
      await deleteTestAnnotations(kbnClient);
    });

    test('create an annotation', async ({ page, pageObjects }) => {
      await pageObjects.annotations.goto();
      await pageObjects.annotations.clickCreateAnnotation();
      await page.getByTestId('annotationTitle').fill(ANNOTATION_TITLE);
      await page.getByTestId('annotationTitle').blur();
      await page.getByTestId('annotationMessage').fill(ANNOTATION_MESSAGE);
      await page.getByTestId('annotationMessage').blur();
      await page.getByTestId('annotationTags').click();
      await page.getByTestId('sloSelector').getByTestId('comboBoxSearchInput').click();
      await page.click('text="All SLOs"');
      await page.getByTestId('annotationSaveButton').click();
      await page.getByTestId('toastCloseButton').click();
      await expect(
        page.locator(`[data-test-subj="annotation-marker-body"]:has-text("${ANNOTATION_TITLE}")`)
      ).toBeVisible();
      await expect(
        page.locator(euiSelectors.basicTable.ROW_SELECTOR).filter({ hasText: ANNOTATION_TITLE })
      ).toHaveCount(1);
      await expectAnnotationTooltip(page, {
        title: ANNOTATION_TITLE,
        message: ANNOTATION_MESSAGE,
      });
    });

    test('Go to SLOs and check that annotation is displayed', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      await seedAnnotation(kbnClient, { title: ANNOTATION_TITLE, message: ANNOTATION_MESSAGE });
      await pageObjects.annotations.goto();
      await pageObjects.slo.openFromSideMenu();
      await page.click('text="Test Stack SLO"');
      await page.testSubj
        .locator('sliChartPanel')
        .locator('.echChartContent')
        .scrollIntoViewIfNeeded();

      await expect(
        page.testSubj.locator('sliChartPanel').locator('[data-testid="echAnnotationMarker"]')
      ).toHaveText(ANNOTATION_TITLE);
    });

    test('update annotation', async ({ page, pageObjects, kbnClient }) => {
      await seedAnnotation(kbnClient, { title: ANNOTATION_TITLE, message: ANNOTATION_MESSAGE });
      await pageObjects.annotations.goto();
      await page.getByRole('button', { name: ANNOTATION_MESSAGE }).click();
      await page.getByTestId('annotationTitle').fill(UPDATED_ANNOTATION_TITLE);
      await page.getByTestId('annotationTitle').blur();
      await page.getByTestId('annotationMessage').fill(UPDATED_ANNOTATION_MESSAGE);
      await page.getByTestId('annotationMessage').blur();
      await page.getByTestId('annotationSaveButton').click();
      await page.getByTestId('toastCloseButton').click();
      await expect(
        page.locator(
          `[data-test-subj="annotation-marker-body"]:has-text("${UPDATED_ANNOTATION_TITLE}")`
        )
      ).toBeVisible();
      await expectAnnotationTooltip(page, {
        title: UPDATED_ANNOTATION_TITLE,
        message: UPDATED_ANNOTATION_MESSAGE,
      });
    });

    test('delete annotation', async ({ page, pageObjects, kbnClient }) => {
      await seedAnnotation(kbnClient, { title: ANNOTATION_TITLE, message: ANNOTATION_MESSAGE });
      await pageObjects.annotations.goto();
      await page.getByRole('button', { name: ANNOTATION_MESSAGE }).click();
      await page.getByTestId('annotationDeleteButton').click();
      await page.getByTestId('toastCloseButton').click();
      await expect(page.getByRole('button', { name: ANNOTATION_MESSAGE })).toBeHidden();
    });
  }
);
