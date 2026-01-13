/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-search';
import { test } from '../fixtures';

test.describe('Getting Started - Admin', { tag: ['@svlSearch'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.gettingStarted.goto();
  });

  test('should load the getting started page', async ({ pageObjects }) => {
    const header = await pageObjects.gettingStarted.getHeader();
    await expect(header).toBeVisible();
  });

  test('Add data button navigates to the upload file page when option is selected', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.gettingStarted.selectAddDataOption('gettingStartedUploadMenuItem');
    await expect(page).toHaveURL(/tutorial_directory\/fileDataViz/);
  });

  test('Add data button navigates to the sample data page when option is selected', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.gettingStarted.selectAddDataOption('gettingStartedSampleDataMenuItem');
    await expect(page).toHaveURL(/tutorial_directory\/sampleData/);
  });

  test('Add data button navigates to the create index page when option is selected', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.gettingStarted.selectAddDataOption('gettingStartedCreateIndexMenuItem');
    await expect(page).toHaveURL(/indices\/create/);
  });

  test('Skip and go to Home button navigates to the home page when clicked', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.gettingStarted.clickSkipAndGoHomeButton();
    await expect(page).toHaveURL(/elasticsearch\/home/);
  });

  test('Elasticsearch endpoint shows checkmark icon feedback when copy button is clicked', async ({
    pageObjects,
  }) => {
    const copyButton = await pageObjects.gettingStarted.getCopyEndpointButton();
    await expect(copyButton).toBeVisible();
    await pageObjects.gettingStarted.clickCopyEndpointButton();

    // After clicking, the button should show copied state
    const copiedButton = await pageObjects.gettingStarted.getCopyEndpointButtonCopied();
    await expect(copiedButton).toBeVisible();
  });

  test('View connection details renders the view connection details button', async ({
    pageObjects,
  }) => {
    const viewConnectionDetailsLink =
      await pageObjects.gettingStarted.getViewConnectionDetailsLink();
    await expect(viewConnectionDetailsLink).toBeVisible();
  });

  test('View connection details opens the connection flyout when the button is clicked', async ({
    pageObjects,
  }) => {
    await pageObjects.gettingStarted.clickViewConnectionDetailsLink();
    const modalTitle = await pageObjects.gettingStarted.getConnectionDetailsModalTitle();
    await expect(modalTitle).toBeVisible();
  });

  test('View connection details should show API Keys tab when user has permission', async ({
    pageObjects,
  }) => {
    await pageObjects.gettingStarted.clickViewConnectionDetailsLink();
    const modalTitle = await pageObjects.gettingStarted.getConnectionDetailsModalTitle();
    await expect(modalTitle).toBeVisible();

    // Both tabs should exist for developer
    const endpointsTab = await pageObjects.gettingStarted.getConnectionDetailsEndpointsTab();
    await expect(endpointsTab).toBeVisible();

    const apiKeysTab = await pageObjects.gettingStarted.getConnectionDetailsApiKeysTab();
    await expect(apiKeysTab).toBeVisible();
  });

  test('Explore the API renders all the tutorial cards', async ({ pageObjects }) => {
    const searchBasicsCard = await pageObjects.gettingStarted.getTutorialCard('search_basics');
    await expect(searchBasicsCard).toBeVisible();

    const semanticSearchCard = await pageObjects.gettingStarted.getTutorialCard('semantic_search');
    await expect(semanticSearchCard).toBeVisible();

    const esqlCard = await pageObjects.gettingStarted.getTutorialCard('esql');
    await expect(esqlCard).toBeVisible();
  });

  test('Explore the API renders all the tutorial card buttons', async ({ pageObjects }) => {
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

  test('Explore the API opens the console when you click the search basics tutorial card', async ({
    pageObjects,
  }) => {
    await pageObjects.gettingStarted.clickTutorialCard('search_basics');

    const embeddedConsole = await pageObjects.gettingStarted.getEmbeddedConsole();
    await expect(embeddedConsole).toBeVisible();

    await pageObjects.gettingStarted.clickEmbeddedConsoleControlBar();
    await expect(embeddedConsole).toBeHidden();
  });

  test('Explore the API opens the console when you click the semantic search tutorial button', async ({
    pageObjects,
  }) => {
    await pageObjects.gettingStarted.clickTutorialCardButton('semantic_search');

    const embeddedConsole = await pageObjects.gettingStarted.getEmbeddedConsole();
    await expect(embeddedConsole).toBeVisible();

    await pageObjects.gettingStarted.clickEmbeddedConsoleControlBar();
    await expect(embeddedConsole).toBeHidden();
  });

  test('Connect to your application renders the JavaScript code example when selected', async ({
    pageObjects,
  }) => {
    await pageObjects.gettingStarted.selectCodingLanguage('javascript');
    const codeSample = await pageObjects.gettingStarted.getCodeSample();
    await expect(codeSample).toContainText('import { Client } from');
  });

  test('Connect to your application renders the cURL code example when selected', async ({
    pageObjects,
  }) => {
    await pageObjects.gettingStarted.selectCodingLanguage('curl');
    const codeSample = await pageObjects.gettingStarted.getCodeSample();
    await expect(codeSample).toContainText('curl -X PUT');
  });

  test('Connect to your application renders the Python code example when selected', async ({
    pageObjects,
  }) => {
    await pageObjects.gettingStarted.selectCodingLanguage('python');
    const codeSample = await pageObjects.gettingStarted.getCodeSample();
    await expect(codeSample).toContainText('from elasticsearch import');
  });

  test('Footer content renders Search Labs callout with correct link', async ({ pageObjects }) => {
    const searchLabsLink = await pageObjects.gettingStarted.getFooterLink('SearchLabs');
    await expect(searchLabsLink).toHaveAttribute('href', /search-labs/);
  });

  test('Footer content renders Elastic Training callout with correct link', async ({
    pageObjects,
  }) => {
    const trainingLink = await pageObjects.gettingStarted.getFooterLink('ElasticTraining');
    await expect(trainingLink).toHaveAttribute('href', /elastic\.co\/training/);
  });

  test('Footer content renders Elasticsearch Documentation callout with correct link', async ({
    pageObjects,
  }) => {
    const docsLink = await pageObjects.gettingStarted.getFooterLink('ViewDocumentation');
    await expect(docsLink).toHaveAttribute('href', /docs\/solutions\/search\/get-started/);
  });
});
