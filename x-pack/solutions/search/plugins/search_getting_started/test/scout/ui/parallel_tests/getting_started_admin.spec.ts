/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-search';
import { test } from '../fixtures';

test.describe('Getting Started - Admin', { tag: ['@ess', '@svlSearch'] }, () => {
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

    await test.step('renders all tutorial cards and buttons', async () => {
      const searchBasicsCard = await pageObjects.gettingStarted.getTutorialCard('search_basics');
      await expect(searchBasicsCard).toBeVisible();

      const semanticSearchCard = await pageObjects.gettingStarted.getTutorialCard(
        'semantic_search'
      );
      await expect(semanticSearchCard).toBeVisible();

      const esqlCard = await pageObjects.gettingStarted.getTutorialCard('esql');
      await expect(esqlCard).toBeVisible();

      const searchBasicsButton = await pageObjects.gettingStarted.getTutorialCardButton(
        'search_basics'
      );
      await expect(searchBasicsButton).toBeVisible();

      const semanticSearchButton = await pageObjects.gettingStarted.getTutorialCardButton(
        'semantic_search'
      );
      await expect(semanticSearchButton).toBeVisible();

      const esqlButton = await pageObjects.gettingStarted.getTutorialCardButton('esql');
      await expect(esqlButton).toBeVisible();
    });

    await test.step('renders footer links with correct hrefs', async () => {
      const searchLabsLink = await pageObjects.gettingStarted.getFooterLink('SearchLabs');
      await expect(searchLabsLink).toHaveAttribute('href', /search-labs/);

      const trainingLink = await pageObjects.gettingStarted.getFooterLink('ElasticTraining');
      await expect(trainingLink).toHaveAttribute('href', /elastic\.co\/training/);

      const docsLink = await pageObjects.gettingStarted.getFooterLink('ViewDocumentation');
      await expect(docsLink).toHaveAttribute('href', /docs\/solutions\/search\/get-started/);
    });
  });

  test('Add data button navigates to correct pages', async ({ pageObjects, page }) => {
    await test.step('navigates to upload file page', async () => {
      await pageObjects.gettingStarted.selectAddDataOption('gettingStartedUploadMenuItem');
      await expect(page).toHaveURL(/tutorial_directory\/fileDataViz/);
    });

    await test.step('navigates to sample data page', async () => {
      await pageObjects.gettingStarted.goto();
      await pageObjects.gettingStarted.selectAddDataOption('gettingStartedSampleDataMenuItem');
      await expect(page).toHaveURL(/tutorial_directory\/sampleData/);
    });

    await test.step('navigates to create index page', async () => {
      await pageObjects.gettingStarted.goto();
      await pageObjects.gettingStarted.selectAddDataOption('gettingStartedCreateIndexMenuItem');
      await expect(page).toHaveURL(/indices\/create/);
    });
  });

  test('Skip and go to Home button navigates to home page', async ({ pageObjects, page }) => {
    await pageObjects.gettingStarted.clickSkipAndGoHomeButton();
    await expect(page).toHaveURL(/elasticsearch\/home/);
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

  test('Tutorial cards open embedded console', async ({ pageObjects }) => {
    await test.step('search basics card opens console', async () => {
      await pageObjects.gettingStarted.clickTutorialCard('search_basics');

      const embeddedConsole = await pageObjects.gettingStarted.getEmbeddedConsole();
      await expect(embeddedConsole).toBeVisible();

      await pageObjects.gettingStarted.clickEmbeddedConsoleControlBar();
      await expect(embeddedConsole).toBeHidden();
    });

    await test.step('semantic search button opens console', async () => {
      await pageObjects.gettingStarted.clickTutorialCardButton('semantic_search');

      const embeddedConsole = await pageObjects.gettingStarted.getEmbeddedConsole();
      await expect(embeddedConsole).toBeVisible();

      await pageObjects.gettingStarted.clickEmbeddedConsoleControlBar();
      await expect(embeddedConsole).toBeHidden();
    });
  });

  test('Language selector shows correct code examples', async ({ pageObjects }) => {
    await test.step('shows JavaScript code example', async () => {
      await pageObjects.gettingStarted.selectCodingLanguage('javascript');
      const codeSample = await pageObjects.gettingStarted.getCodeSample();
      await expect(codeSample).toContainText('import { Client } from');
    });

    await test.step('shows cURL code example', async () => {
      await pageObjects.gettingStarted.selectCodingLanguage('curl');
      const codeSample = await pageObjects.gettingStarted.getCodeSample();
      await expect(codeSample).toContainText('curl -X PUT');
    });

    await test.step('shows Python code example', async () => {
      await pageObjects.gettingStarted.selectCodingLanguage('python');
      const codeSample = await pageObjects.gettingStarted.getCodeSample();
      await expect(codeSample).toContainText('from elasticsearch import');
    });
  });
});
