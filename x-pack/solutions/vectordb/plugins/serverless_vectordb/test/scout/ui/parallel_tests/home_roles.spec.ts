/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { mockDeploymentStats, seedReturningUser, spaceTest } from '../fixtures';

spaceTest.describe('Vector DB home page by role', { tag: [...tags.serverless.vectordb] }, () => {
  spaceTest.beforeEach(async ({ page }) => {
    await seedReturningUser(page);
    await mockDeploymentStats(page, { indicesCount: 2, documentsCount: 8 });
  });

  spaceTest(
    'offers the data management action to a privileged user',
    async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.vectordbHome.goto();

      await expect(pageObjects.vectordbHome.manageDataButton).toBeVisible();
    }
  );

  spaceTest(
    'withholds the data management action from a viewer role',
    async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.vectordbHome.goto();

      await expect(pageObjects.vectordbHome.dataCard).toBeVisible();
      await expect(pageObjects.vectordbHome.manageDataButton).toBeHidden();
    }
  );
});
