/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'common',
    'embeddedConsole',
    'apiKeys',
    'searchGettingStarted',
    'searchHomePage',
    'searchNavigation',
  ]);
  const searchSpace = getService('searchSpace');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Search Getting Started page', function () {
    describe('Solution Nav - Search', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };

      before(async () => {
        ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace(
          'search-getting-started-ftr'
        ));
        await searchSpace.navigateTo(spaceCreated.id);
      });

      after(async () => {
        // Clean up space created
        await cleanUp();
      });

      describe('Getting Started page', function () {
        beforeEach(async () => {
          await pageObjects.searchNavigation.navigateToElasticsearchSearchGettingStartedPage();
        });

        it('load search getting started', async () => {
          await pageObjects.searchGettingStarted.expectSearchGettingStartedIsLoaded();
        });
        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });
      });

      describe('Getting Started page interactions', function () {
        beforeEach(async () => {
          await pageObjects.searchNavigation.navigateToElasticsearchSearchGettingStartedPage();
        });

        describe('Add data button', function () {
          it('navigates to the upload file page when option is selected', async () => {
            await pageObjects.searchGettingStarted.selectAddDataOption(
              'gettingStartedUploadMenuItem'
            );
            await retry.tryWithRetries(
              'wait for URL to change',
              async () => {
                expect(await browser.getCurrentUrl()).to.contain('/tutorial_directory/fileDataViz');
              },
              { initialDelay: 200, retryCount: 5, retryDelay: 500 }
            );
          });
          it('navigates to the sample data page when option is selected', async () => {
            await pageObjects.searchGettingStarted.selectAddDataOption(
              'gettingStartedSampleDataMenuItem'
            );
            await retry.tryWithRetries(
              'wait for URL to change',
              async () => {
                expect(await browser.getCurrentUrl()).to.contain('/tutorial_directory/sampleData');
              },
              { initialDelay: 200, retryCount: 5, retryDelay: 500 }
            );
          });
          it('navigates to the empty index page when option is selected', async () => {
            await pageObjects.searchGettingStarted.selectAddDataOption(
              'gettingStartedCreateIndexMenuItem'
            );

            await retry.tryWithRetries(
              'wait for URL to change',
              async () => {
                expect(await browser.getCurrentUrl()).to.contain('/indices/create');
              },
              { initialDelay: 200, retryCount: 5, retryDelay: 500 }
            );
          });
        });

        describe('Skip and go to Home button', function () {
          it('navigates to the home page when clicked', async () => {
            await testSubjects.click('skipAndGoHomeBtn');
            await pageObjects.searchHomePage.expectToBeOnHomepage();
          });
        });

        describe('Elasticsearch endpoint', function () {
          it('renders endpoint field and copy button', async () => {
            await testSubjects.existOrFail('endpointValueField');
            await testSubjects.existOrFail('copyEndpointButton');
            const endpointValue = await testSubjects.getVisibleText('endpointValueField');
            expect(endpointValue).to.contain('https://');
          });
        });

        describe('View connection details', function () {
          it('renders the view connection details button', async () => {
            await testSubjects.existOrFail('viewConnectionDetailsLink');
          });
          it('opens the connection flyout when the button is clicked', async () => {
            await testSubjects.click('viewConnectionDetailsLink');
            await testSubjects.existOrFail('connectionDetailsModalTitle');
          });
        });

        describe('Explore the API', function () {
          it('renders all the tutorial cards', async () => {
            await testSubjects.existOrFail('console_tutorials_search_basics');
            await testSubjects.existOrFail('console_tutorials_semantic_search');
            await testSubjects.existOrFail('console_tutorials_esql');
          });
          it('renders all the tutorial card buttons', async () => {
            await testSubjects.existOrFail('console_tutorials_search_basics-btn');
            await testSubjects.existOrFail('console_tutorials_semantic_search-btn');
            await testSubjects.existOrFail('console_tutorials_esql-btn');
          });
          it('opens the console when you click the search basics tutorial card', async () => {
            await testSubjects.existOrFail('console_tutorials_search_basics');
            await testSubjects.click('console_tutorials_search_basics');
            await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeOpen();
            await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
            await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
          });
          it('opens the console when you click the semantic search tutorial button', async () => {
            await testSubjects.existOrFail('console_tutorials_semantic_search-btn');
            const tutorialButton = await testSubjects.find('console_tutorials_semantic_search-btn');
            await tutorialButton.scrollIntoView();
            await tutorialButton.click();
            await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeOpen();
            await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
            await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
          });
        });

        describe('Connect to your application', function () {
          it('renders the JavaScript code example when selected in Language Selector', async () => {
            await pageObjects.searchGettingStarted.selectCodingLanguage('javascript');
            await pageObjects.searchGettingStarted.expectCodeSampleContainsValue(
              'import { Client } from'
            );
          });
          it('renders the cURL code example when selected in Language Selector', async () => {
            await pageObjects.searchGettingStarted.selectCodingLanguage('curl');
            await pageObjects.searchGettingStarted.expectCodeSampleContainsValue('curl -X PUT');
          });
          it('renders the Python code example when selected in Language Selector', async () => {
            await pageObjects.searchGettingStarted.selectCodingLanguage('python');
            await pageObjects.searchGettingStarted.expectCodeSampleContainsValue(
              'from elasticsearch import'
            );
          });
        });

        describe('Footer content', function () {
          it('renders Search Labs callout and navigates correctly', async () => {
            const href = await testSubjects.getAttribute('gettingStartedSearchLabs-btn', 'href');
            expect(href).to.contain('search-labs');
          });
          it('renders Python Notebooks callout and navigates correctly', async () => {
            const href = await testSubjects.getAttribute('gettingStartedOpenNotebooks-btn', 'href');
            expect(href).to.contain('search-labs/tutorials/examples');
          });
          it('renders Elasticsearch Documentation callout and navigates correctly', async () => {
            const href = await testSubjects.getAttribute(
              'gettingStartedViewDocumentation-btn',
              'href'
            );
            expect(href).to.contain('docs/solutions/search/get-started');
          });
        });
      });
    });
  });
}
