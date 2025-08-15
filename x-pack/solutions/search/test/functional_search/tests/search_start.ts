/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, searchStart, searchNavigation, embeddedConsole } = getPageObjects([
    'searchStart',
    'common',
    'searchNavigation',
    'embeddedConsole',
  ]);
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const es = getService('es');
  const browser = getService('browser');
  const spaces = getService('spaces');

  const deleteAllTestIndices = async () => {
    await esDeleteAllIndices(['search-*', 'test-*']);
  };

  describe('Elasticsearch Start [Onboarding Empty State]', function () {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the search solution and navigate to its home page
      ({ cleanUp, space: spaceCreated } = await spaces.create({
        name: 'search-ftr',
        solution: 'es',
      }));
      await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
      await deleteAllTestIndices();
      await searchStart.clearSkipEmptyStateStorageFlag();
    });

    describe('Developer rights', function () {
      beforeEach(async () => {
        await deleteAllTestIndices();
        await searchNavigation.navigateToElasticsearchStartPage();
      });

      it('should have embedded dev console', async () => {
        await searchStart.expectToBeOnStartPage();
        await testHasEmbeddedConsole({ embeddedConsole });
      });

      it('should support index creation flow with UI', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.expectCreateIndexUIView();
        await searchStart.expectCreateIndexButtonToBeEnabled();
        await searchStart.clickCreateIndexButton();
        await searchStart.expectToBeOnIndexDetailsPage();
      });

      it('should support setting index name', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.expectIndexNameToExist();
        await searchStart.setIndexNameValue('INVALID_INDEX');
        await searchStart.expectCreateIndexButtonToBeDisabled();
        await searchStart.setIndexNameValue('test-index-name');
        await searchStart.expectCreateIndexButtonToBeEnabled();
        await searchStart.clickCreateIndexButton();
        await searchStart.expectToBeOnIndexDetailsPage();
      });

      it('should redirect to index details when index is created via API', async () => {
        await searchStart.expectToBeOnStartPage();
        await es.indices.create({ index: 'test-my-index' });
        await searchStart.expectToBeOnIndexDetailsPage();
      });

      it('should redirect to index list when multiple indices are created via API', async () => {
        await searchStart.expectToBeOnStartPage();
        await es.indices.create({ index: 'test-my-index-001' });
        await es.indices.create({ index: 'test-my-index-002' });
        await searchStart.expectToBeOnIndexListPage();
      });
      it('should redirect to indices list if single index exist on page load', async () => {
        await searchNavigation.navigateToElasticsearchStartPage(false, `/s/${spaceCreated.id}`);
        await es.indices.create({ index: 'test-my-index-001' });
        await searchNavigation.navigateToElasticsearchStartPage(true);
        await searchStart.expectToBeOnIndexListPage();
      });

      it('should support switching between UI and Code Views', async () => {
        await searchNavigation.navigateToElasticsearchStartPage(false, `/s/${spaceCreated.id}`);
        await searchStart.expectCreateIndexUIView();
        await searchStart.clickCodeViewButton();
        await searchStart.expectCreateIndexCodeView();
        await searchStart.clickUIViewButton();
        await searchStart.expectCreateIndexUIView();
      });

      it('should have file upload link', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.clickFileUploadLink();
        await searchStart.expectToBeOnMLFileUploadPage();
      });

      it('should have o11y links', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.expectAnalyzeLogsIntegrationLink();
        await searchStart.expectCreateO11ySpaceBtn();
      });

      it('should have close button', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.expectCloseCreateIndexButtonExists();
        await searchStart.clickCloseCreateIndexButton();
        await searchStart.expectToBeOnSearchHomepagePage();
      });

      it('should have skip button', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.expectSkipButtonExists();
        await searchStart.clickSkipButton();
        await searchStart.expectToBeOnSearchHomepagePage();
      });
    });
  });
}
