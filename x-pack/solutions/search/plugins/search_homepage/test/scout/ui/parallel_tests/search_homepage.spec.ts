/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-search';
import { test } from '../fixtures';
import { SEARCH_HOMEPAGE_V2_UI_FLAG } from '../../../../common';

const INDEX_NAME = 'test-my-index';
const SAMPLE_DATA_INDEX = 'kibana_sample_data_elasticsearch_documentation';

test.describe('Search Homepage (V1)', { tag: ['@ess', '@svlSearch'] }, () => {
  // Disable the V2 homepage to test the old (V1) homepage
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await kbnClient.uiSettings.update({
      [SEARCH_HOMEPAGE_V2_UI_FLAG]: false,
    });
    // Create a test index so homepage loads properly
    await esClient.indices.create({ index: INDEX_NAME }).catch(() => {});
  });

  test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await page.addInitScript(() => {
      window.localStorage.setItem('gettingStartedVisited', 'true');
    });
    await pageObjects.homepage.goto();
  });

  test.afterAll(async ({ kbnClient, esClient }) => {
    // Reset to default (V2 enabled)
    await kbnClient.uiSettings.unset(SEARCH_HOMEPAGE_V2_UI_FLAG);
    // Clean up test indices
    await esClient.indices.delete({ index: [INDEX_NAME, SAMPLE_DATA_INDEX] }).catch(() => {});
  });

  // === Basic Page Load Tests ===
  test('should load search home page', async ({ pageObjects }) => {
    const homepageContainer = await pageObjects.homepage.getSearchHomepageContainer();
    await expect(homepageContainer).toBeVisible();
  });

  test('should have embedded dev console', async ({ pageObjects }) => {
    await pageObjects.homepage.expectEmbeddedConsoleControlBarExists();

    const consoleBodyInitial = await pageObjects.homepage.getEmbeddedConsoleBody();
    await expect(consoleBodyInitial).toBeHidden();

    await pageObjects.homepage.clickEmbeddedConsoleControlBar();

    const fullscreenToggle = await pageObjects.homepage.getFullscreenToggleButton();
    await expect(fullscreenToggle).toBeVisible();

    const consoleBodyOpen = await pageObjects.homepage.getEmbeddedConsoleBody();
    await expect(consoleBodyOpen).toBeVisible();

    await pageObjects.homepage.clickEmbeddedConsoleControlBar();

    const consoleBodyClosed = await pageObjects.homepage.getEmbeddedConsoleBody();
    await expect(consoleBodyClosed).toBeHidden();
  });

  // === Elasticsearch endpoint and API Keys ===
  test('renders Elasticsearch endpoint with copy functionality', async ({ pageObjects }) => {
    const copyEndpointButton = await pageObjects.homepage.getCopyEndpointButton();
    await expect(copyEndpointButton).toBeVisible();

    const endpointValueField = await pageObjects.homepage.getEndpointValueField();
    await expect(endpointValueField).toBeVisible();
  });

  test('shows checkmark icon feedback when copy button is clicked', async ({ pageObjects }) => {
    const copyEndpointButton = await pageObjects.homepage.getCopyEndpointButton();
    await expect(copyEndpointButton).toBeVisible();

    await copyEndpointButton.click();

    // After clicking, the button should show copied state
    const copiedButton = await pageObjects.homepage.getCopyEndpointButtonCopied();
    await expect(copiedButton).toBeVisible();

    // After a short delay, it should revert back to normal state
    const normalButton = await pageObjects.homepage.getCopyEndpointButton();
    await expect(normalButton).toBeVisible();
  });

  test('renders API keys button correctly', async ({ pageObjects }) => {
    const createApiKeyButton = await pageObjects.homepage.getCreateApiKeyButton();
    await expect(createApiKeyButton).toBeVisible();
  });

  test('opens create_api_key flyout on clicking CreateApiKey button', async ({ pageObjects }) => {
    await pageObjects.homepage.clickCreateApiKeyButton();

    const flyoutHeader = await pageObjects.homepage.getCreateApiKeyFlyoutHeader();
    await expect(flyoutHeader).toBeVisible();
    await expect(flyoutHeader).toContainText('Create API key');
  });

  // === Connect To Elasticsearch Side Panel ===
  test('renders the "Upload a file" card and navigates correctly', async ({
    pageObjects,
    page,
  }) => {
    const uploadFileButton = await pageObjects.homepage.getUploadFileButton();
    await expect(uploadFileButton).toBeVisible();

    await pageObjects.homepage.clickUploadFileButton();

    await expect(page).toHaveURL(/ml\/filedatavisualizer/);
  });

  test('renders the sample data section', async ({ pageObjects }) => {
    const sampleDataSection = await pageObjects.homepage.getSampleDataSection();
    await expect(sampleDataSection).toBeVisible();
  });

  test('renders the "Install sample data" button when sample data index does not exist', async ({
    pageObjects,
  }) => {
    const installSampleBtn = await pageObjects.homepage.getInstallSampleDataButton();
    await expect(installSampleBtn).toBeVisible();
  });

  test('renders the "View data" button when sample data index exists', async ({
    pageObjects,
    esClient,
  }) => {
    // Create the sample data index
    await esClient.indices.create({ index: SAMPLE_DATA_INDEX }).catch(() => {});

    // Refresh the page to see the updated state
    await pageObjects.homepage.goto();

    const viewDataBtn = await pageObjects.homepage.getViewDataButton();
    await expect(viewDataBtn).toBeVisible();

    // Clean up for other tests
    await esClient.indices.delete({ index: SAMPLE_DATA_INDEX }).catch(() => {});
  });

  test('renders the "Create an index" card and navigates correctly', async ({
    pageObjects,
    page,
  }) => {
    const createIndexCard = await pageObjects.homepage.getCreateIndexCard();
    await expect(createIndexCard).toBeVisible();

    const createIndexButton = await pageObjects.homepage.getCreateIndexButton();
    await expect(createIndexButton).toBeVisible();

    await pageObjects.homepage.clickCreateIndexButton();

    await expect(page).toHaveURL(/indices\/create/);
  });

  // === Get started with API (Console Tutorials) ===
  test('clicking on search basics tutorial opens console', async ({ pageObjects }) => {
    const tutorial = await pageObjects.homepage.getConsoleTutorial('search_basics');
    await expect(tutorial).toBeVisible();

    const tutorialButton = await pageObjects.homepage.getConsoleTutorialButton('search_basics');
    await expect(tutorialButton).toBeVisible();

    await pageObjects.homepage.clickConsoleTutorialButton('search_basics');

    const consoleEditor = await pageObjects.homepage.getConsoleEditorContainer();
    await expect(consoleEditor).toBeVisible();
  });

  test('clicking on semantic search tutorial opens console', async ({ pageObjects }) => {
    const tutorial = await pageObjects.homepage.getConsoleTutorial('semantic_search');
    await expect(tutorial).toBeVisible();

    const tutorialButton = await pageObjects.homepage.getConsoleTutorialButton('semantic_search');
    await expect(tutorialButton).toBeVisible();

    await pageObjects.homepage.clickConsoleTutorialButton('semantic_search');

    const consoleEditor = await pageObjects.homepage.getConsoleEditorContainer();
    await expect(consoleEditor).toBeVisible();
  });

  test('clicking on esql tutorial opens console', async ({ pageObjects }) => {
    const tutorial = await pageObjects.homepage.getConsoleTutorial('esql');
    await expect(tutorial).toBeVisible();

    const tutorialButton = await pageObjects.homepage.getConsoleTutorialButton('esql');
    await expect(tutorialButton).toBeVisible();

    await pageObjects.homepage.clickConsoleTutorialButton('esql');

    const consoleEditor = await pageObjects.homepage.getConsoleEditorContainer();
    await expect(consoleEditor).toBeVisible();
  });

  // === Alternate Solutions ===
  // Stateful (ESS): "Create an Observability space" - navigates internally
  test(
    'renders Observability section with space link',
    { tag: ['@ess'] },
    async ({ pageObjects, page }) => {
      const observabilitySection = await pageObjects.homepage.getObservabilitySection();
      await expect(observabilitySection).toBeVisible();

      const createSpaceLink = await pageObjects.homepage.getCreateObservabilitySpaceLink();
      await expect(createSpaceLink).toBeVisible();

      await pageObjects.homepage.clickCreateObservabilitySpaceLink();
      await expect(page).toHaveURL(/management\/kibana\/spaces\/create/);
    }
  );

  // Serverless: "Create an Observability project" - external link to cloud
  test(
    'renders Observability section with project link',
    { tag: ['@svlSearch'] },
    async ({ pageObjects }) => {
      const observabilitySection = await pageObjects.homepage.getObservabilitySection();
      await expect(observabilitySection).toBeVisible();

      const createProjectLink = await pageObjects.homepage.getCreateObservabilityProjectLink();
      await expect(createProjectLink).toBeVisible();
      await expect(createProjectLink).toHaveAttribute('href', /projects/);
    }
  );

  test('renders Security content and navigates correctly', async ({ pageObjects, page }) => {
    const securitySection = await pageObjects.homepage.getSecuritySection();
    await expect(securitySection).toBeVisible();

    const setupElasticDefendLink = await pageObjects.homepage.getSetupElasticDefendLink();
    await expect(setupElasticDefendLink).toBeVisible();

    await pageObjects.homepage.clickSetupElasticDefendLink();

    await expect(page).toHaveURL(/elastic-defend/);
  });

  // === Dive deeper with Elasticsearch ===
  test('renders Search labs content', async ({ pageObjects, page }) => {
    const searchLabsSection = await pageObjects.homepage.getSearchLabsSection();
    await expect(searchLabsSection).toBeVisible();

    const searchLabsButton = await pageObjects.homepage.getSearchLabsButton();
    await expect(searchLabsButton).toBeVisible();

    await pageObjects.homepage.clickSearchLabsButton();

    await expect(page).toHaveURL(/search-labs/);
  });

  test('renders Open Notebooks content', async ({ pageObjects, page }) => {
    const pythonNotebooksSection = await pageObjects.homepage.getPythonNotebooksSection();
    await expect(pythonNotebooksSection).toBeVisible();

    const openNotebooksButton = await pageObjects.homepage.getOpenNotebooksButton();
    await expect(openNotebooksButton).toBeVisible();

    await pageObjects.homepage.clickOpenNotebooksButton();

    await expect(page).toHaveURL(/search-labs\/tutorials\/examples/);
  });

  test('renders Elasticsearch Documentation content', async ({ pageObjects, page }) => {
    const elasticsearchDocumentationSection =
      await pageObjects.homepage.getElasticsearchDocumentationSection();
    await expect(elasticsearchDocumentationSection).toBeVisible();

    const viewDocumentationButton = await pageObjects.homepage.getViewDocumentationButton();
    await expect(viewDocumentationButton).toBeVisible();

    await pageObjects.homepage.clickViewDocumentationButton();

    await expect(page).toHaveURL(/docs\/solutions\/search\/get-started/);
  });
});
