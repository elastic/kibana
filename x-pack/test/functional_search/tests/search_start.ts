/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, searchApiKeys, searchStart, searchNavigation, embeddedConsole } = getPageObjects([
    'searchStart',
    'common',
    'searchApiKeys',
    'searchNavigation',
    'embeddedConsole',
  ]);
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const es = getService('es');
  const browser = getService('browser');
  const retry = getService('retry');
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
    });

    describe('Developer rights', function () {
      beforeEach(async () => {
        await deleteAllTestIndices();
        await searchApiKeys.deleteAPIKeys();
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

      it('should show the api key in code view', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.clickCodeViewButton();
        // sometimes the API key exists in the cluster and its lost in sessionStorage
        // if fails we retry to delete the API key and refresh the browser
        await retry.try(
          async () => {
            await searchApiKeys.expectAPIKeyExists();
          },
          async () => {
            await searchApiKeys.deleteAPIKeys();
            await browser.refresh();
            await searchStart.clickCodeViewButton();
          }
        );
        await searchApiKeys.expectAPIKeyAvailable();

        const apiKeyUI = await searchApiKeys.getAPIKeyFromUI();
        const apiKeySession = await searchApiKeys.getAPIKeyFromSessionStorage();

        expect(apiKeyUI).to.eql(apiKeySession.encoded);

        // check that when browser is refreshed, the api key is still available
        await browser.refresh();
        await searchStart.clickCodeViewButton();
        await searchApiKeys.expectAPIKeyAvailable();
        await searchStart.expectAPIKeyPreGenerated();
        const refreshBrowserApiKeyUI = await searchApiKeys.getAPIKeyFromUI();
        expect(refreshBrowserApiKeyUI).to.eql(apiKeyUI);

        // check that when api key is invalidated, a new one is generated
        await searchApiKeys.invalidateAPIKey(apiKeySession.id);
        await browser.refresh();
        await searchStart.clickCodeViewButton();
        await searchApiKeys.expectAPIKeyAvailable();
        const newApiKeyUI = await searchApiKeys.getAPIKeyFromUI();
        expect(newApiKeyUI).to.not.eql(apiKeyUI);
        await searchStart.expectAPIKeyVisibleInCodeBlock(newApiKeyUI);
      });

      it('should create a new api key when the existing one is invalidated', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.clickCodeViewButton();
        await searchApiKeys.expectAPIKeyAvailable();

        // Get initial API key
        const initialApiKey = await searchApiKeys.getAPIKeyFromSessionStorage();
        expect(initialApiKey.id).to.not.be(null);

        // Navigate away to keep key in current session, invalidate key and return back
        await searchNavigation.navigateToIndexManagementPage();
        await searchApiKeys.invalidateAPIKey(initialApiKey.id);
        await searchNavigation.navigateToElasticsearchStartPage(false, `/s/${spaceCreated.id}`);
        await searchStart.clickCodeViewButton();

        // Check that new key was generated
        await searchApiKeys.expectAPIKeyAvailable();
        const newApiKey = await searchApiKeys.getAPIKeyFromSessionStorage();
        expect(newApiKey).to.not.be(null);
        expect(newApiKey.id).to.not.eql(initialApiKey.id);
      });

      it('should explicitly ask to create api key when project already has an apikey', async () => {
        await searchApiKeys.clearAPIKeySessionStorage();
        await searchApiKeys.createAPIKey();
        await searchStart.expectToBeOnStartPage();
        await searchStart.clickCodeViewButton();
        await searchApiKeys.createApiKeyFromFlyout();
        await searchApiKeys.expectAPIKeyAvailable();
      });

      it('Same API Key should be present on start page and index detail view', async () => {
        await searchStart.clickCodeViewButton();
        await searchApiKeys.expectAPIKeyAvailable();
        const apiKeyUI = await searchApiKeys.getAPIKeyFromUI();

        await searchStart.clickUIViewButton();
        await searchStart.clickCreateIndexButton();
        await searchStart.expectToBeOnIndexDetailsPage();

        await searchApiKeys.expectShownAPIKeyAvailable();
        const indexDetailsApiKey = await searchApiKeys.getAPIKeyFromUI();

        expect(apiKeyUI).to.eql(indexDetailsApiKey);
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
        await searchStart.expectToBeOnIndexListPage();
      });

      it('should have skip button', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.expectSkipButtonExists();
        await searchStart.clickSkipButton();
        await searchStart.expectToBeOnIndexListPage();
      });
    });
  });
}
