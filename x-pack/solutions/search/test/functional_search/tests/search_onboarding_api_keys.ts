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
  const searchSpace = getService('searchSpace');

  const indexName = 'test-my-index';

  const deleteAllTestIndices = async () => {
    await esDeleteAllIndices(['search-*', 'test-*']);
  };

  // Failing: See https://github.com/elastic/kibana/issues/227104
  describe.skip('Search onboarding API keys', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };
    before(async () => {
      ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace(
        'search-onboarding-apikeys-ftr'
      ));

      await pageObjects.searchApiKeys.deleteAPIKeys();
      await deleteAllTestIndices();

      await searchSpace.navigateTo(spaceCreated.id);
    });
    after(async () => {
      // Clean up space created
      await cleanUp();
      await pageObjects.searchApiKeys.deleteAPIKeys();
      await deleteAllTestIndices();
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
