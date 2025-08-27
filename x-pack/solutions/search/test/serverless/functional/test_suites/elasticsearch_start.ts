/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'embeddedConsole',
    'svlSearchElasticsearchStartPage',
    'svlApiKeys',
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const es = getService('es');

  const deleteAllTestIndices = async () => {
    await esDeleteAllIndices(['search-*', 'test-*']);
  };

  describe('Elasticsearch Start [Onboarding Empty State]', function () {
    describe('developer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginWithRole('developer');
      });
      after(async () => {
        await deleteAllTestIndices();
        await pageObjects.svlSearchElasticsearchStartPage.clearSkipEmptyStateStorageFlag();
      });
      beforeEach(async () => {
        await deleteAllTestIndices();
        await pageObjects.svlApiKeys.deleteAPIKeys();
        await svlSearchNavigation.navigateToElasticsearchStartPage();
      });

      it('should have embedded dev console', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await testHasEmbeddedConsole(pageObjects);
      });

      it('should support index creation flow with UI', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexUIView();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexButtonToBeEnabled();
        await pageObjects.svlSearchElasticsearchStartPage.clickCreateIndexButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();
      });

      it('should support setting index name', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectIndexNameToExist();
        await pageObjects.svlSearchElasticsearchStartPage.setIndexNameValue('INVALID_INDEX');
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexButtonToBeDisabled();
        await pageObjects.svlSearchElasticsearchStartPage.setIndexNameValue('test-index-name');
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexButtonToBeEnabled();
        await pageObjects.svlSearchElasticsearchStartPage.clickCreateIndexButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();
      });

      it('should redirect to index details when index is created via API', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await es.indices.create({ index: 'test-my-index' });
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();
      });

      it('should redirect to index list when multiple indices are created via API', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await es.indices.create({ index: 'test-my-index-001' });
        await es.indices.create({ index: 'test-my-index-002' });
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexListPage();
      });
      it('should redirect to indices list if single index exist on page load', async () => {
        await svlSearchNavigation.navigateToGettingStartedPage();
        await es.indices.create({ index: 'test-my-index-001' });
        await svlSearchNavigation.navigateToElasticsearchStartPage(true);
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexListPage();
      });

      it('should have file upload link', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.clickFileUploadLink();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnMLFileUploadPage();
      });

      it('should have o11y links', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectAnalyzeLogsLink();
        await pageObjects.svlSearchElasticsearchStartPage.expectO11yTrialLink();
      });

      it('should have close button', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectCloseCreateIndexButtonExists();
        await pageObjects.svlSearchElasticsearchStartPage.clickCloseCreateIndexButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnSearchHomepagePage();
      });
      it('should have skip button', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectSkipButtonExists();
        await pageObjects.svlSearchElasticsearchStartPage.clickSkipButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnSearchHomepagePage();
      });
    });
    describe('viewer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsViewer();
        await deleteAllTestIndices();
      });
      beforeEach(async () => {
        await svlSearchNavigation.navigateToElasticsearchStartPage(true);
      });

      it('should navigate to the discover page', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnDiscoverPage();
      });
    });
  });
}
