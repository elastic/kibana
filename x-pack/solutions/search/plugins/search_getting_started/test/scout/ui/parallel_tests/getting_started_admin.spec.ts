/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-search/ui';
import { tags } from '@kbn/scout-search';
import { test } from '../fixtures';

test.describe(
  'Getting Started - Admin',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.gettingStarted.goto();
    });

    test('verifies page elements are rendered correctly', async ({ pageObjects }) => {
      await test.step('should load the getting started page with header', async () => {
        const header = await pageObjects.gettingStarted.getHeader();
        await expect(header).toBeVisible();
      });

      await test.step('renders endpoint field with https URL and copy button', async () => {
        const endpointField = await pageObjects.gettingStarted.getEndpointValueField();
        await expect(endpointField).toBeVisible();
        await expect(endpointField).toContainText('https://');

        const copyButton = await pageObjects.gettingStarted.getCopyEndpointButton();
        await expect(copyButton).toBeVisible();
      });

      await test.step('renders view connection details button', async () => {
        const viewConnectionDetailsLink =
          await pageObjects.gettingStarted.getViewConnectionDetailsLink();
        await expect(viewConnectionDetailsLink).toBeVisible();
      });

      await test.step('renders agent install section', async () => {
        const agentInstallBtn = await pageObjects.gettingStarted.getAgentInstallLaunchBtn();
        await expect(agentInstallBtn).toBeVisible();
      });

      await test.step('renders sample data buttons', async () => {
        const uploadFilesButton = await pageObjects.gettingStarted.getUploadFilesButton();
        await expect(uploadFilesButton).toBeVisible();

        const viewSampleDataButton = await pageObjects.gettingStarted.getViewSampleDataButton();
        await expect(viewSampleDataButton).toBeVisible();
      });

      await test.step('renders all tutorial cards', async () => {
        const allCards = await pageObjects.gettingStarted.getTutorialCards();
        expect(allCards.length).toBeGreaterThanOrEqual(6);

        const searchBasicsCard = await pageObjects.gettingStarted.getTutorialCard('search_basics');
        await expect(searchBasicsCard).toBeVisible();

        const semanticSearchCard = await pageObjects.gettingStarted.getTutorialCard(
          'semantic_search'
        );
        await expect(semanticSearchCard).toBeVisible();

        const esqlCard = await pageObjects.gettingStarted.getTutorialCard('esql');
        await expect(esqlCard).toBeVisible();

        const tsdsCard = await pageObjects.gettingStarted.getTutorialCard('tsds');
        await expect(tsdsCard).toBeVisible();
      });

      await test.step('renders kibana version badge', async () => {
        const versionBadge = await pageObjects.gettingStarted.getKibanaVersionBadge();
        await expect(versionBadge).toBeVisible();
      });
    });

    test('Sample data buttons navigate to correct pages', async ({ pageObjects, page }) => {
      await test.step('upload files button navigates to file upload page', async () => {
        await pageObjects.gettingStarted.clickUploadFilesButton();
        await expect(page).toHaveURL(/tutorial_directory\/fileDataViz/);
      });

      await test.step('view sample data button navigates to sample data page', async () => {
        await pageObjects.gettingStarted.goto();
        await pageObjects.gettingStarted.clickViewSampleDataButton();
        await expect(page).toHaveURL(/tutorial_directory\/sampleData/);
      });
    });

    test('Elasticsearch endpoint copy button shows feedback', async ({ pageObjects }) => {
      const copyButton = await pageObjects.gettingStarted.getCopyEndpointButton();
      await expect(copyButton).toBeVisible();
      await pageObjects.gettingStarted.clickCopyEndpointButton();

      const copiedButton = await pageObjects.gettingStarted.getCopyEndpointButtonCopied();
      await expect(copiedButton).toBeVisible();
    });

    test('Connection details flyout works correctly', async ({ pageObjects }) => {
      await test.step('opens flyout when button is clicked', async () => {
        await pageObjects.gettingStarted.clickViewConnectionDetailsLink();
        const modalTitle = await pageObjects.gettingStarted.getConnectionDetailsModalTitle();
        await expect(modalTitle).toBeVisible();
      });

      await test.step('shows both endpoints and API Keys tabs for admin', async () => {
        const endpointsTab = await pageObjects.gettingStarted.getConnectionDetailsEndpointsTab();
        await expect(endpointsTab).toBeVisible();

        const apiKeysTab = await pageObjects.gettingStarted.getConnectionDetailsApiKeysTab();
        await expect(apiKeysTab).toBeVisible();
      });
    });

    test('Agent install panel opens prompt modal with copy option', async ({ pageObjects }) => {
      await pageObjects.gettingStarted.clickAgentInstallLaunchBtn();

      const copyBtn = await pageObjects.gettingStarted.getPromptModalCopyBtn();
      await expect(copyBtn).toBeVisible();
    });

    test(
      'Agent builder panel opens agent builder flyout',
      { tag: [...tags.serverless.search] },
      async ({ pageObjects }) => {
        const agentBuilderBtn =
          await pageObjects.gettingStarted.getAgentInstallOpenInAgentBuilderBtn();
        await expect(agentBuilderBtn).toBeVisible();

        await pageObjects.gettingStarted.clickAgentInstallOpenInAgentBuilderBtn();

        const sidebarPanel = await pageObjects.gettingStarted.getAgentBuilderSidebarPanel();
        await expect(sidebarPanel).toBeVisible();
      }
    );

    test('Tutorial cards open embedded console', async ({ pageObjects }) => {
      await test.step('search basics card opens console', async () => {
        await pageObjects.gettingStarted.clickTutorialCardAndScrollIntoView('search_basics');

        const embeddedConsole = await pageObjects.gettingStarted.getEmbeddedConsole();
        await expect(embeddedConsole).toBeVisible();

        await pageObjects.gettingStarted.clickEmbeddedConsoleControlBar();
        await expect(embeddedConsole).toBeHidden();
      });

      await test.step('semantic search card opens console', async () => {
        await pageObjects.gettingStarted.clickTutorialCardAndScrollIntoView('semantic_search');

        const embeddedConsole = await pageObjects.gettingStarted.getEmbeddedConsole();
        await expect(embeddedConsole).toBeVisible();

        await pageObjects.gettingStarted.clickEmbeddedConsoleControlBar();
        await expect(embeddedConsole).toBeHidden();
      });
    });
  }
);
