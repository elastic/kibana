/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { mockDeploymentStats, test } from '../fixtures';

test.describe(
  'Homepage - Admin',
  { tag: [...tags.serverless.search, ...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ page, browserAuth }) => {
      await browserAuth.loginAsAdmin();
      await page.addInitScript(() => {
        window.localStorage.setItem('gettingStartedVisited', 'true');
      });
    });

    test('renders the shared home page with every stat card', async ({ pageObjects }) => {
      await pageObjects.homepage.goto();

      const { homepage } = pageObjects;
      await expect(homepage.container).toBeVisible();
      await expect(homepage.header).toContainText('Welcome');
      await expect(homepage.dataCard).toBeVisible();
      await expect(homepage.dashboardsCard).toBeVisible();
      await expect(homepage.workflowsCard).toBeVisible();
      await expect(homepage.apiKeysCard).toBeVisible();
      await expect(homepage.documentationLink).toHaveText(/Learn more about Elasticsearch/);
    });

    test('directs an empty deployment to getting started from the banner', async ({
      page,
      pageObjects,
    }) => {
      await mockDeploymentStats(page);
      await pageObjects.homepage.goto();

      await expect(pageObjects.homepage.banner).toContainText('Get started with Elasticsearch');
      await pageObjects.homepage.bannerGetStartedButton.click();

      await expect(page).toHaveURL(/getting_started/);
    });

    test('drops the banner once the deployment holds data', async ({ page, pageObjects }) => {
      await mockDeploymentStats(page, { indicesCount: 3, documentsCount: 10 });
      await pageObjects.homepage.goto();

      await expect(pageObjects.homepage.dataCardTotalIndicesValue).toHaveText('3');
      await expect(pageObjects.homepage.banner).toBeHidden();
    });

    test('manage data navigates to index management', async ({ page, pageObjects }) => {
      await pageObjects.homepage.goto();

      await pageObjects.homepage.manageDataButton.click();

      await expect(page).toHaveURL(/index_management/);
    });

    test('opens the connection details flyout', async ({ pageObjects }) => {
      await pageObjects.homepage.goto();

      await pageObjects.homepage.connectionDetailsButton.click();

      await expect(pageObjects.homepage.connectionDetailsFlyout).toBeVisible();
      await expect(pageObjects.homepage.connectionDetailsFlyoutTitle).toBeVisible();
    });

    test('creates an API key through the connection details flyout', async ({ pageObjects }) => {
      await pageObjects.homepage.goto();

      const { homepage } = pageObjects;
      await homepage.generateApiKeyButton.click();
      await expect(homepage.connectionDetailsFlyout).toBeVisible();

      await homepage.apiKeyNameInput.fill('Test API Key');
      await homepage.createApiKeySubmitButton.click();

      await expect(homepage.apiKeySuccessForm).toBeVisible();
      await expect(homepage.apiKeyValueRow).toBeVisible();
    });

    test('opens Console from the add data links', async ({ pageObjects }) => {
      await pageObjects.homepage.goto();

      await pageObjects.homepage.addDataDevToolsLink.click();

      await expect(pageObjects.consolePage.inputEditor).toBeVisible();
    });

    test('shows the agent skills prompt for building in an IDE', async ({ pageObjects }) => {
      await pageObjects.homepage.goto();

      await pageObjects.homepage.viewPromptButton.click();

      await expect(pageObjects.homepage.promptModal).toContainText(
        'npx skills add elastic/agent-skills'
      );
    });

    // clicking would auto-send the onboarding message to an LLM, which Scout has no connector for
    test('offers to chat with the AI agent', async ({ pageObjects }) => {
      await pageObjects.homepage.goto();

      await expect(pageObjects.homepage.openElasticAgentButton).toBeVisible();
    });

    test('has an embedded dev console that can be toggled', async ({ pageObjects }) => {
      await pageObjects.homepage.goto();

      const { embeddedConsole } = pageObjects;
      await expect(embeddedConsole.section).toBeVisible();
      await expect(embeddedConsole.body).toBeHidden();

      await embeddedConsole.toggle();
      await expect(embeddedConsole.fullscreenToggle).toBeVisible();
      await expect(embeddedConsole.body).toBeVisible();

      await embeddedConsole.toggle();
      await expect(embeddedConsole.body).toBeHidden();
    });
  }
);
