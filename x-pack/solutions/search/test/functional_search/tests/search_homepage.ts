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
  const pageObjects = getPageObjects([
    'embeddedConsole',
    'header',
    'common',
    'searchStart',
    'searchOverview',
    'apiKeys',
    'searchHomePage',
    'searchNavigation',
  ]);
  const es = getService('es');
  const browser = getService('browser');
  const spaces = getService('spaces');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

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
        await esDeleteAllIndices(['test-*', 'search-*']);
      });

      describe('search home page', () => {
        beforeEach(async () => {
          await esDeleteAllIndices(['test-*', 'search-*']);
          await pageObjects.searchNavigation.navigateToElasticsearchOverviewPage(
            `/s/${spaceCreated.id}`
          );
        });

        afterEach(async () => {
          await esDeleteAllIndices(['test-*', 'search-*']);
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

      describe('search home page with existing indices', () => {
        before(async () => {
          await es.indices.create({ index: indexName });
          await pageObjects.searchNavigation.navigateToElasticsearchSearchHomePage(
            `/s/${spaceCreated.id}`
          );
        });

        beforeEach(async () => {
          await pageObjects.searchNavigation.navigateToElasticsearchSearchHomePage();
        });

        after(async () => {
          await esDeleteAllIndices(['test-*', 'search-*']);
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

          it('opens create_api_key flyout on clicking CreateApiKey button', async () => {
            await testSubjects.click('createApiKeyButton');
            await retry.try(async () => {
              expect(await pageObjects.apiKeys.getFlyoutTitleText()).to.be('Create API key');
            });
          });

          it('opens API keys management page on clicking Manage API Keys', async () => {
            await testSubjects.existOrFail('manageApiKeysButton');
            await testSubjects.click('manageApiKeysButton');
            expect(await browser.getCurrentUrl()).contain('/app/management/security/api_keys');
          });
        });

        describe('Connect To Elasticsearch Side Panel', function () {
          it('renders the "Upload a file" card with copy link', async () => {
            await testSubjects.existOrFail('uploadFileButton');
            await testSubjects.click('uploadFileButton');
            expect(await browser.getCurrentUrl()).contain('ml/filedatavisualizer');
          });

          describe('Sample data section', function () {
            it('renders the sample data section', async () => {
              await testSubjects.existOrFail('sampleDataSection');
            });

            describe('when sample-data-elasticsearch index does not exist', function () {
              it('renders the "Install sample data" button', async () => {
                await testSubjects.existOrFail('installSampleBtn');
              });
            });

            describe('when sample-data-elasticsearch index exists', function () {
              before(async () => {
                await es.indices.create({ index: 'sample-data-elasticsearch' });
              });

              after(async () => {
                await esDeleteAllIndices(['sample-data-elasticsearch']);
              });

              it('renders the "View data" button', async () => {
                await testSubjects.existOrFail('viewDataBtn');
              });
            });
          });
        });

        describe('AI search capabilities', function () {
          it('renders Semantic Search content', async () => {
            await testSubjects.existOrFail('aiSearchCapabilities-item-semantic');
            await testSubjects.existOrFail('createSemanticOptimizedIndexButton');
            await testSubjects.click('createSemanticOptimizedIndexButton');
            expect(await browser.getCurrentUrl()).contain(
              'app/elasticsearch/indices/create?workflow=semantic'
            );
            await testSubjects.existOrFail('createIndexBtn');
            expect(await testSubjects.isEnabled('createIndexBtn')).equal(true);
            await testSubjects.click('createIndexBtn');
            await retry.tryForTime(60 * 1000, async () => {
              expect(await browser.getCurrentUrl()).contain('data?workflow=semantic');
            });
          });

          it('renders Vector Search content', async () => {
            await testSubjects.scrollIntoView('aiSearchCapabilities-item-vector');
            await testSubjects.existOrFail('aiSearchCapabilities-item-vector');
            await testSubjects.click('aiSearchCapabilities-item-vector');
            await testSubjects.existOrFail('createVectorIndexButton');
            await testSubjects.click('createVectorIndexButton');
            expect(await browser.getCurrentUrl()).contain(
              'app/elasticsearch/indices/create?workflow=vector'
            );

            await testSubjects.existOrFail('createIndexBtn');
            expect(await testSubjects.isEnabled('createIndexBtn')).equal(true);
            await testSubjects.click('createIndexBtn');
            await retry.tryForTime(60 * 1000, async () => {
              expect(await browser.getCurrentUrl()).contain('data?workflow=vector');
            });
          });
        });

        describe('Alternate Solutions', function () {
          it('renders Observability content', async () => {
            await testSubjects.scrollIntoView('analyzeLogsBrowseIntegrations');
            await testSubjects.existOrFail('analyzeLogsBrowseIntegrations');
            await testSubjects.click('analyzeLogsBrowseIntegrations');
            expect(await browser.getCurrentUrl()).contain('browse/observability');
          });
        });

        // FLAKY: https://github.com/elastic/kibana/issues/226572
        describe.skip('Dive deeper with Elasticsearch', function () {
          it('renders Search labs content', async () => {
            await testSubjects.existOrFail('searchLabsSection');
            await testSubjects.existOrFail('searchLabsButton');
            await testSubjects.click('searchLabsButton');
            expect(await browser.getCurrentUrl()).contain('search-labs');
          });

          it('renders Open Notebooks content', async () => {
            await testSubjects.existOrFail('pythonNotebooksSection');
            await testSubjects.existOrFail('openNotebooksButton');
            await testSubjects.click('openNotebooksButton');
            expect(await browser.getCurrentUrl()).contain('search-labs/tutorials/examples');
          });

          it('renders Elasticsearch Documentation content', async () => {
            await testSubjects.existOrFail('elasticsearchDocumentationSection');
            await testSubjects.existOrFail('viewDocumentationButton');
            await testSubjects.click('viewDocumentationButton');
            expect(await browser.getCurrentUrl()).contain('docs/solutions/search/get-started');
          });
        });

        describe('Footer content', function () {
          it('displays the community link', async () => {
            await testSubjects.existOrFail('elasticCommunityLink');
            await testSubjects.click('elasticCommunityLink');
            expect(await browser.getCurrentUrl()).contain('community/');
          });

          it('displays the feedbacks link', async () => {
            await testSubjects.existOrFail('giveFeedbackLink');
            await testSubjects.click('giveFeedbackLink');
            expect(await browser.getCurrentUrl()).contain('kibana/feedback');
          });
        });
      });
    });
  });
}
