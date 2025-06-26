/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';
import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'embeddedConsole',
    'header',
    'common',
    'searchStart',
    'searchOverview',
    'searchHomePage',
    'searchNavigation',
  ]);
  const es = getService('es');
  const browser = getService('browser');
  const spaces = getService('spaces');
  const testSubjects = getService('testSubjects');

  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const indexName = 'test-my-index';

  describe('Search Home page', function () {
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

      describe('search home page', () => {
        beforeEach(async () => {
          await esDeleteAllIndices(indexName);
          await pageObjects.searchNavigation.navigateToElasticsearchOverviewPage(
            `/s/${spaceCreated.id}`
          );
        });

        afterEach(async () => {
          await esDeleteAllIndices(indexName);
        });

        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });

        it('redirect to start page when no indices are exists', async () => {
          await pageObjects.searchStart.expectToBeOnStartPage();
        });

        it('load search home page', async () => {
          await es.indices.create({ index: indexName });
          await pageObjects.searchNavigation.navigateToElasticsearchSearchHomePage();
          await pageObjects.searchHomePage.expectSearchHomePageIsLoaded();
        });
      });

      describe.only('search home page with index', () => {
        before(async () => {
          await es.indices.create({ index: indexName });
          await pageObjects.searchNavigation.navigateToElasticsearchSearchHomePage(
            `/s/${spaceCreated.id}`
          );
        });

        after(async () => {
          await esDeleteAllIndices(indexName);
        });

        it('load search home page', async () => {
          await pageObjects.searchNavigation.navigateToElasticsearchSearchHomePage();
          await pageObjects.searchHomePage.expectSearchHomePageIsLoaded();
        });

        describe('Elasticsearch endpoint and API Keys', function () {
          it('renders Elasticsearch endpoint with copy functionality', async () => {
            await testSubjects.existOrFail('copyEndpointButton');
            await testSubjects.existOrFail('endpointValueField');
          });

          it('renders API keys buttons and active badge correctly', async () => {
            await testSubjects.existOrFail('createApiKeyButton');
            await testSubjects.existOrFail('manageApiKeysButton');
            await testSubjects.existOrFail('activeApiKeysBadge');
          });

          it('opens API keys management page on clicking Manage API Keys', async () => {
            await testSubjects.existOrFail('manageApiKeysButton');
            await testSubjects.click('manageApiKeysButton');
            expect(await browser.getCurrentUrl()).contain('/app/management/security/api_keys');
          });
        });
      });
    });
  });
}
