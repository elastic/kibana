/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

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
  const browser = getService('browser');
  const retry = getService('retry');

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

      it('should support switching between UI and Code Views', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexUIView();
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexCodeView();
        await pageObjects.svlSearchElasticsearchStartPage.clickUIViewButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexUIView();
      });

      it('should show the api key in code view', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
        // sometimes the API key exists in the cluster and its lost in sessionStorage
        // if fails we retry to delete the API key and refresh the browser
        await retry.try(
          async () => {
            await pageObjects.svlApiKeys.expectAPIKeyExists();
          },
          async () => {
            await pageObjects.svlApiKeys.deleteAPIKeys();
            await browser.refresh();
            await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
          }
        );
        await pageObjects.svlApiKeys.expectAPIKeyAvailable();

        const apiKeyUI = await pageObjects.svlApiKeys.getAPIKeyFromUI();
        const apiKeySession = await pageObjects.svlApiKeys.getAPIKeyFromSessionStorage();

        expect(apiKeyUI).to.eql(apiKeySession.encoded);

        // check that when browser is refreshed, the api key is still available
        await browser.refresh();
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
        await pageObjects.svlApiKeys.expectAPIKeyAvailable();
        await pageObjects.svlSearchElasticsearchStartPage.expectAPIKeyPreGenerated();
        const refreshBrowserApiKeyUI = await pageObjects.svlApiKeys.getAPIKeyFromUI();
        expect(refreshBrowserApiKeyUI).to.eql(apiKeyUI);

        // check that when api key is invalidated, a new one is generated
        await pageObjects.svlApiKeys.invalidateAPIKey(apiKeySession.id);
        await browser.refresh();
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
        await pageObjects.svlApiKeys.expectAPIKeyAvailable();
        const newApiKeyUI = await pageObjects.svlApiKeys.getAPIKeyFromUI();
        expect(newApiKeyUI).to.not.eql(apiKeyUI);
        await pageObjects.svlSearchElasticsearchStartPage.expectAPIKeyVisibleInCodeBlock(
          newApiKeyUI
        );
      });

      it('should create a new api key when the existing one is invalidated', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
        await pageObjects.svlApiKeys.expectAPIKeyAvailable();
        // Get initial API key
        const initialApiKey = await pageObjects.svlApiKeys.getAPIKeyFromSessionStorage();
        expect(initialApiKey.id).to.not.be(null);

        // Navigate away to keep key in current session, invalidate key and return back
        await svlSearchNavigation.navigateToInferenceManagementPage();
        await pageObjects.svlApiKeys.invalidateAPIKey(initialApiKey.id);
        await svlSearchNavigation.navigateToElasticsearchStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();

        // Check that new key was generated
        await pageObjects.svlApiKeys.expectAPIKeyAvailable();
        const newApiKey = await pageObjects.svlApiKeys.getAPIKeyFromSessionStorage();
        expect(newApiKey).to.not.be(null);
        expect(newApiKey.id).to.not.eql(initialApiKey.id);
      });

      it('should explicitly ask to create api key when project already has an apikey', async () => {
        await pageObjects.svlApiKeys.clearAPIKeySessionStorage();
        await pageObjects.svlApiKeys.createAPIKey();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
        await pageObjects.svlApiKeys.createApiKeyFromFlyout();
        await pageObjects.svlApiKeys.expectAPIKeyAvailable();
      });

      it('Same API Key should be present on start page and index detail view', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
        await pageObjects.svlApiKeys.expectAPIKeyAvailable();
        const apiKeyUI = await pageObjects.svlApiKeys.getAPIKeyFromUI();

        await pageObjects.svlSearchElasticsearchStartPage.clickUIViewButton();
        await pageObjects.svlSearchElasticsearchStartPage.clickCreateIndexButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();

        await pageObjects.svlApiKeys.expectShownAPIKeyAvailable();
        const indexDetailsApiKey = await pageObjects.svlApiKeys.getAPIKeyFromUI();

        expect(apiKeyUI).to.eql(indexDetailsApiKey);
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
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexListPage();
      });
      it('should have skip button', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectSkipButtonExists();
        await pageObjects.svlSearchElasticsearchStartPage.clickSkipButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexListPage();
      });
    });
    describe('viewer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsViewer();
        await deleteAllTestIndices();
      });
      beforeEach(async () => {
        await svlSearchNavigation.navigateToElasticsearchStartPage();
      });
      after(async () => {
        await deleteAllTestIndices();
      });

      it('should default to code view when lacking create index permissions', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexCodeView();
        await pageObjects.svlSearchElasticsearchStartPage.clickUIViewButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexUIView();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexButtonToBeDisabled();
      });

      it('should not create an API key if the user only has viewer permissions', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.clickCodeViewButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectAPIKeyFormNotAvailable();
        const apiKey = await pageObjects.svlApiKeys.getAPIKeyFromSessionStorage();
        expect(apiKey).to.be(null);
      });

      it('should redirect to index details when index is created via API', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexCodeView();
        await es.indices.create({ index: 'test-my-api-index' });
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();
      });
    });
  });
}
