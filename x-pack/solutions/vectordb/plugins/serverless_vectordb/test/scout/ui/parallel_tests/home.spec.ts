/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { mockDeploymentStats, seedReturningUser, spaceTest } from '../fixtures';

spaceTest.describe('Vector DB home page', { tag: [...tags.serverless.vectordb] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsPrivilegedUser();
    await seedReturningUser(page);
  });

  spaceTest(
    'displays the welcome header, stat cards and documentation link',
    async ({ page, pageObjects }) => {
      await mockDeploymentStats(page);
      await pageObjects.vectordbHome.goto();

      const { vectordbHome } = pageObjects;
      await expect(vectordbHome.header).toContainText('Welcome');
      await expect(vectordbHome.dataCard).toBeVisible();
      await expect(vectordbHome.dashboardsCard).toBeVisible();
      await expect(vectordbHome.workflowsCard).toBeVisible();
      await expect(vectordbHome.apiKeysCard).toBeVisible();
      await expect(vectordbHome.documentationLink).toBeVisible();
    }
  );

  spaceTest('renders the stats returned for the project', async ({ page, pageObjects }) => {
    await mockDeploymentStats(page, {
      indicesCount: 7,
      documentsCount: 12345,
      storeSizeBytes: 1536,
      dashboardsCount: 2,
      apiKeysCount: 4,
      expiringApiKeysCount: 1,
    });
    await pageObjects.vectordbHome.goto();

    const { vectordbHome } = pageObjects;
    await expect(vectordbHome.statValue('homePageDataCard', 'totalIndices')).toHaveText('7');
    await expect(vectordbHome.statValue('homePageDataCard', 'documents')).toHaveText('12,345');
    await expect(vectordbHome.statValue('homePageDataCard', 'totalSize')).toContainText('KB');
    await expect(vectordbHome.statValue('homePageDashboardsCard', 'dashboardsTotal')).toHaveText(
      '2'
    );
    await expect(vectordbHome.statValue('homePageApiKeysCard', 'apiKeysTotal')).toHaveText('4');
    await expect(vectordbHome.statValue('homePageApiKeysCard', 'apiKeysExpiring')).toHaveText('1');
  });

  spaceTest(
    'directs an empty project into the setup guide from the banner',
    async ({ page, pageObjects }) => {
      await mockDeploymentStats(page, { indicesCount: 0, vectorCount: 0 });
      await pageObjects.vectordbHome.goto();

      await expect(pageObjects.vectordbHome.banner).toBeVisible();

      await pageObjects.vectordbHome.bannerGetStartedButton.click();

      await expect(pageObjects.onboarding.generatePathCard).toBeVisible();
    }
  );

  spaceTest('drops the setup banner once the project holds data', async ({ page, pageObjects }) => {
    await mockDeploymentStats(page, { indicesCount: 3, documentsCount: 10 });
    await pageObjects.vectordbHome.goto();

    await expect(pageObjects.vectordbHome.dataCard).toBeVisible();
    await expect(pageObjects.vectordbHome.banner).toBeHidden();
  });

  spaceTest(
    'surfaces the most recently created index until it is dismissed',
    async ({ page, pageObjects }) => {
      await mockDeploymentStats(page, {
        indicesCount: 1,
        documentsCount: 42,
        newIndex: {
          indexName: 'my-newest-index',
          createdAt: Date.now(),
          documentsCount: 42,
          sizeInBytes: 2048,
        },
      });
      await pageObjects.vectordbHome.goto();

      const { vectordbHome } = pageObjects;
      await expect(vectordbHome.newIndexName).toContainText('my-newest-index');

      await vectordbHome.newIndexDismissButton.click();

      await expect(vectordbHome.newIndexPanel).toBeHidden();
    }
  );

  spaceTest('opens the setup guide from the add data links', async ({ page, pageObjects }) => {
    await mockDeploymentStats(page, { indicesCount: 1 });
    await pageObjects.vectordbHome.goto();

    const { vectordbHome } = pageObjects;
    await expect(vectordbHome.addDataDevToolsLink).toBeVisible();
    await expect(vectordbHome.addDataSampleDataLink).toBeVisible();
    await expect(vectordbHome.addDataUploadFileLink).toBeVisible();

    await vectordbHome.addDataEmbeddingsLink.click();

    await expect(pageObjects.onboarding.generatePathCard).toBeVisible();
  });

  spaceTest(
    'shows the agent skills prompt for building in an IDE',
    async ({ page, pageObjects }) => {
      await mockDeploymentStats(page, { indicesCount: 1 });
      await pageObjects.vectordbHome.goto();

      const { vectordbHome } = pageObjects;
      await expect(vectordbHome.openElasticAgentButton).toBeVisible();

      await vectordbHome.viewPromptButton.click();
      await expect(vectordbHome.promptModal).toContainText('npx skills add elastic/agent-skills');

      await vectordbHome.promptModalCloseButton.click();
      await expect(vectordbHome.promptModal).toBeHidden();
    }
  );
});
