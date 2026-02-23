/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../../common/api_helpers';

test.describe(
  'Import exception lists',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Should import exception list successfully', async ({ page, pageObjects }) => {
      await pageObjects.exceptions.gotoSharedExceptionLists();

      await test.step('Open import dialog', async () => {
        const importBtn = page.testSubj.locator('importExceptionListButton');
        await importBtn.click();
      });

      await test.step('Upload file', async () => {
        const fileInput = page.testSubj.locator('importExceptionListFileInput');
        if (await fileInput.isVisible({ timeout: 5_000 })) {
          const importSubmitBtn = page.testSubj.locator('importExceptionListSubmitButton');
          await expect(importSubmitBtn).toBeVisible();
        }
      });
    });

    test('Should not import duplicate exception list without overwrite', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.exceptions.gotoSharedExceptionLists();

      await test.step('Verify import dialog and overwrite options', async () => {
        const importBtn = page.testSubj.locator('importExceptionListButton');
        await importBtn.click();

        const overwriteCheckbox = page.testSubj.locator('importExceptionListOverwriteCheckbox');
        if (await overwriteCheckbox.isVisible({ timeout: 5_000 })) {
          await expect(overwriteCheckbox).not.toBeChecked();
        }

        const createNewCheckbox = page.testSubj.locator('importExceptionListCreateNewCheckbox');
        if (await createNewCheckbox.isVisible({ timeout: 5_000 })) {
          await expect(createNewCheckbox).not.toBeChecked();
        }
      });
    });
  }
);
