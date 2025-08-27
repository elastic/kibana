/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

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
