/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'searchIndexDetailsPage',
    'searchApiKeys',
    'searchStart',
    'header',
    'common',
    'indexManagement',
    'searchNavigation',
    'solutionNavigation',
  ]);
  const browser = getService('browser');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const retry = getService('retry');
  const spaces = getService('spaces');

  const indexName = 'test-my-index';

  const deleteAllTestIndices = async () => {
    await esDeleteAllIndices(['search-*', 'test-*']);
  };

  // Failing: See https://github.com/elastic/kibana/issues/227104
  describe.skip('Search onboarding API keys', () => {
    let cleanUpSpace: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };
    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await pageObjects.common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the search solution and navigate to its home page
      ({ cleanUp: cleanUpSpace, space: spaceCreated } = await spaces.create({
        name: 'search-onboarding-apikeys-ftr',
        solution: 'es',
      }));

      await pageObjects.searchApiKeys.deleteAPIKeys();
      await deleteAllTestIndices();

      await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
    });
    after(async () => {
      // Clean up space created
      await cleanUpSpace();
      await pageObjects.searchApiKeys.deleteAPIKeys();
      await deleteAllTestIndices();
    });
    describe('Elasticsearch Start [Onboarding Empty State]', () => {
      let apiKeySession: { encoded: string; id: string } | null = null;
      const { searchApiKeys, searchStart, searchNavigation } = pageObjects;
      before(async () => {
        await retry.tryWithRetries(
          'Wait for redirect to start page',
          async () => {
            await pageObjects.searchStart.expectToBeOnStartPage();
          },
          {
            retryCount: 2,
            retryDelay: 1000,
          }
        );
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
        apiKeySession = await searchApiKeys.getAPIKeyFromSessionStorage();

        expect(apiKeySession).not.to.be(null);
        expect(apiKeyUI).to.eql(apiKeySession!.encoded);

        // check that when browser is refreshed, the api key is still available
        await browser.refresh();
        await searchStart.clickCodeViewButton();
        await searchApiKeys.expectAPIKeyAvailable();
        await searchStart.expectAPIKeyPreGenerated();
        const refreshBrowserApiKeyUI = await searchApiKeys.getAPIKeyFromUI();
        expect(refreshBrowserApiKeyUI).to.eql(apiKeyUI);

        // Following tests are skipped as they are not working in the current setup. We will need to look into what is causing the issue with API key invalidation and regeneration.

        // check that when api key is invalidated, a new one is generated
        // await searchApiKeys.invalidateAPIKey(apiKeySession!.id);
        // await browser.refresh();
        // await searchStart.clickCodeViewButton();
        // await searchApiKeys.expectAPIKeyAvailable();
        // const newApiKeyUI = await searchApiKeys.getAPIKeyFromUI();
        // expect(newApiKeyUI).to.not.eql(apiKeyUI);
        // await searchStart.expectAPIKeyVisibleInCodeBlock(newApiKeyUI);
      });

      it('should create a new api key when the existing one is invalidated', async () => {
        await searchStart.expectToBeOnStartPage();
        await searchStart.clickCodeViewButton();
        await searchApiKeys.expectAPIKeyAvailable();

        // Get initial API key
        const initialApiKey = await searchApiKeys.getAPIKeyFromSessionStorage();
        expect(initialApiKey).to.not.be(null);
        expect(initialApiKey!.id).to.not.be(null);

        // Navigate away to keep key in current session, invalidate key and return back
        await searchNavigation.navigateToIndexManagementPage();
        await searchApiKeys.invalidateAPIKey(initialApiKey!.id);
        await searchNavigation.navigateToElasticsearchStartPage(false, `/s/${spaceCreated.id}`);
        await searchStart.clickCodeViewButton();

        // Check that new key was generated
        await searchApiKeys.expectAPIKeyAvailable();
        const newApiKey = await searchApiKeys.getAPIKeyFromSessionStorage();
        expect(newApiKey).to.not.be(null);
        expect(newApiKey!.id).to.not.eql(initialApiKey!.id);
      });

      it('should explicitly ask to create api key when project already has an apikey', async () => {
        await searchApiKeys.clearAPIKeySessionStorage();
        await searchApiKeys.createAPIKey();
        await browser.refresh();
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

        await searchApiKeys.expectAPIKeyAvailable();
        const indexDetailsApiKey = await searchApiKeys.getAPIKeyFromUI();

        expect(apiKeyUI).to.eql(indexDetailsApiKey);
      });
    });
    describe('index details page', () => {
      before(async () => {
        await es.indices.create({ index: indexName });
        await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
        await pageObjects.searchIndexDetailsPage.expectIndexDetailsPageIsLoaded();
        await pageObjects.searchIndexDetailsPage.dismissIngestTourIfShown();
      });
      it('should show api key', async () => {
        // sometimes the API key exists in the cluster and its lost in sessionStorage
        // if fails we retry to delete the API key and refresh the browser
        await retry.try(
          async () => {
            await pageObjects.searchApiKeys.expectAPIKeyExists();
          },
          async () => {
            await pageObjects.searchApiKeys.deleteAPIKeys();
            await browser.refresh();
          }
        );
        await pageObjects.searchApiKeys.expectAPIKeyAvailable();
        const apiKey = await pageObjects.searchApiKeys.getAPIKeyFromUI();
        await pageObjects.searchIndexDetailsPage.expectAPIKeyToBeVisibleInCodeBlock(apiKey);
      });
    });
    describe.skip('create index page', () => {
      // TODO test API Keys displayed on create index page
    });
  });
}
