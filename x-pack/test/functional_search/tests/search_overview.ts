/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'embeddedConsole',
    'header',
    'common',
    'searchStart',
    'searchOverview',
    'searchNavigation',
  ]);
  const es = getService('es');
  const browser = getService('browser');
  const spaces = getService('spaces');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const indexName = 'test-my-index';

  describe('Search Overview page', function () {
    describe('Solution Nav - Search', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };

      before(async () => {
        // Navigate to the spaces management page which will log us in Kibana
        await pageObjects.common.navigateToUrl('management', 'kibana/spaces', {
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
        await esDeleteAllIndices(indexName);
      });

      describe('search overview page', () => {
        beforeEach(async () => {
          await esDeleteAllIndices(indexName);
          await pageObjects.searchNavigation.navigateToElasticsearchOverviewPage(
            `/s/${spaceCreated.id}`
          );
        });

        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });

        it('redirect to start page when no indices are exists', async () => {
          await pageObjects.searchStart.expectToBeOnStartPage();
        });

        it('load search overview page', async () => {
          await es.indices.create({ index: indexName });
          await pageObjects.searchNavigation.navigateToElasticsearchOverviewPage();
          await pageObjects.searchOverview.expectOverviewPageIsLoaded();
        });
      });
    });

    describe('Classic Nav', function () {
      before(async () => {
        await pageObjects.searchNavigation.navigateToElasticsearchOverviewPage();
      });

      it('load search overview page when no indices are exists', async () => {
        await pageObjects.searchOverview.expectOverviewPageIsLoaded();
      });
    });
  });
}
