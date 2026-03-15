/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../../common/api_helpers';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Alerts page filters - filters customization',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices);
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should be able to customize Controls', async ({ page, pageObjects }) => {
      const { alertFilters } = pageObjects;

      await test.step('Delete an existing control', async () => {
        await alertFilters.switchToEditMode();
        const initialCount = await alertFilters.getControlFrameCount().count();
        await alertFilters.deleteControl(3);
        await page.testSubj.locator('confirmModalConfirmButton').click();
        const afterDeleteCount = await alertFilters.getControlFrameCount().count();
        expect(afterDeleteCount).toBeLessThan(initialCount);
      });

      await test.step('Add a new control', async () => {
        await alertFilters.addControl('@timestamp');
      });

      await test.step('Discard changes restores original controls', async () => {
        await alertFilters.discardChanges();
        const controlTitles = alertFilters.page.testSubj.locator('control-frame-title');
        await expect(controlTitles).not.toContainText(['@timestamp']);
      });
    });

    test('should not sync to the URL in edit mode but only in view mode', async ({
      page,
      pageObjects,
    }) => {
      const { alertFilters } = pageObjects;
      const urlBefore = page.url();

      await alertFilters.switchToEditMode();
      await alertFilters.deleteControl(3);
      await page.testSubj.locator('confirmModalConfirmButton').click();
      await alertFilters.addControl('@timestamp');

      await test.step('URL should not change in edit mode', async () => {
        expect(page.url()).toBe(urlBefore);
      });

      await test.step('URL should change after saving', async () => {
        await alertFilters.saveChanges();
        expect(page.url()).not.toBe(urlBefore);
      });
    });

    test('should not show number fields in field edit panel', async ({ page, pageObjects }) => {
      const { alertFilters } = pageObjects;
      await alertFilters.switchToEditMode();

      const controlTitle = alertFilters.getControlFrameTitle(3);
      await controlTitle.hover();
      await alertFilters.getEditAction(3).click();
      await alertFilters.controlEditorFlyout.waitFor({ state: 'visible' });

      await alertFilters.fieldTypeFilterButton.click();

      const stringOption = page.testSubj.locator('typeFilter-string');
      const booleanOption = page.testSubj.locator('typeFilter-boolean');
      const ipOption = page.testSubj.locator('typeFilter-ip');
      const numberOption = page.testSubj.locator('typeFilter-number');

      await expect(stringOption).toBeVisible();
      await expect(booleanOption).toBeVisible();
      await expect(ipOption).toBeVisible();
      await expect(numberOption).toBeHidden();
    });
  }
);
